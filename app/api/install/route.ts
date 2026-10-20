import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import {
  missingColumns,
  buildRepairSql,
} from "@/lib/settings-schema";

export const dynamic = "force-dynamic";

const INIT_SQL = `
create extension if not exists pgcrypto;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  site_name text,
  site_url text,
  language text not null default 'id',
  theme_template text not null default 'modern',
  ninerouter_url text,
  ninerouter_key text,
  model_writer text not null default 'openai/gpt-4o',
  model_planner text not null default 'openai/gpt-4o',
  embedding_model text,
  brand_voice text,
  niche text,
  audience text,
  posts_per_run integer not null default 3,
  auto_publish boolean not null default false,
  default_author text,
  whatsapp_number text,
  whatsapp_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings add column if not exists theme_template text not null default 'modern';
alter table public.settings add column if not exists google_site_verification text;
alter table public.settings add column if not exists whatsapp_number text;
alter table public.settings add column if not exists whatsapp_message text;

insert into public.settings (singleton, site_name, niche, audience)
values (true, 'Situs Anda', 'Umum & Bisnis', 'Masyarakat Umum')
on conflict do nothing;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  primary_keyword text,
  intent text,
  angle text,
  status text not null default 'idea' check (status in ('idea', 'approved', 'used', 'rejected')),
  score integer,
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_status_idx on public.topics (status, created_at desc);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics (id) on delete set null,
  slug text not null unique,
  title text not null,
  excerpt text,
  content_md text,
  seo_title text,
  seo_description text,
  keywords text[],
  author text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  published_at timestamptz,
  scheduled_for timestamptz,
  cover_image_url text,
  reading_time_minutes integer,
  word_count integer,
  model text,
  embedding jsonb,
  meta jsonb,
  language text not null default 'id',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles add column if not exists language text not null default 'id';

create index if not exists articles_status_published_idx on public.articles (status, published_at desc);
create index if not exists articles_scheduled_idx on public.articles (status, scheduled_for);
create index if not exists articles_lang_published_idx on public.articles (language, status, published_at desc);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('brainstorm', 'generate', 'publish')),
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  topic_id uuid references public.topics (id) on delete set null,
  article_id uuid references public.articles (id) on delete set null,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  meta jsonb
);

create index if not exists generation_jobs_started_idx on public.generation_jobs (started_at desc);

create table if not exists public.whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  visitor_phone text not null,
  visitor_name text,
  visitor_message text,
  page_path text,
  article_slug text,
  referrer text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_leads_created_idx on public.whatsapp_leads (created_at desc);
create index if not exists whatsapp_leads_status_idx on public.whatsapp_leads (status, created_at desc);

alter table public.settings enable row level security;
alter table public.topics enable row level security;
alter table public.articles enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.whatsapp_leads enable row level security;

drop policy if exists "articles_public_read_published" on public.articles;
create policy "articles_public_read_published" on public.articles
  for select to anon using (status = 'published');

-- ---------------------------------------------------------------------------
-- Redirects permanen (otomatis saat slug artikel berubah)
-- ---------------------------------------------------------------------------
create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code integer not null default 301,
  hits integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists redirects_from_idx on public.redirects (from_path);

alter table public.redirects enable row level security;

drop policy if exists "redirects_public_read" on public.redirects;
create policy "redirects_public_read" on public.redirects
  for select to anon, authenticated using (true);

create or replace function public.register_article_slug_redirect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    insert into public.redirects (from_path, to_path, status_code)
    values ('/blog/' || old.slug, '/blog/' || new.slug, 301)
    on conflict (from_path) do update
      set to_path = excluded.to_path,
          status_code = excluded.status_code;
  end if;
  return new;
end;
$$;

drop trigger if exists articles_slug_redirect on public.articles;
create trigger articles_slug_redirect
  after update of slug on public.articles
  for each row execute function public.register_article_slug_redirect();

notify pgrst, 'reload schema';
`;

export async function POST() {
  if (!hasServiceRole()) {
    return NextResponse.json(
      {
        success: false,
        error: "SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL belum disetel di Vercel.",
      },
      { status: 500 },
    );
  }

  try {
    const sb = createAdminClient();

    const { error: probeError } = await sb.from("settings").select("id").limit(1);

    if (probeError && probeError.code === "42P01") {
      return NextResponse.json({
        success: false,
        tablesExist: false,
        missingColumns: [],
        sql: INIT_SQL,
        message: "Tabel belum dibuat di Supabase. Salin SQL ini dan jalankan 1 klik di Supabase SQL Editor.",
      });
    }
    if (probeError) {
      return NextResponse.json(
        { success: false, error: probeError.message, sql: INIT_SQL },
        { status: 500 },
      );
    }

    const missing = await missingColumns();
    const repair = buildRepairSql(missing);

    return NextResponse.json({
      success: missing.length === 0,
      tablesExist: true,
      missingColumns: missing,
      sql: repair,
      message:
        missing.length === 0
          ? "Database Supabase terhubung & semua kolom siap digunakan."
          : `Kolom belum lengkap: ${missing.join(", ")}. Jalankan SQL di bawah di Supabase SQL Editor.`,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message, sql: INIT_SQL },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
