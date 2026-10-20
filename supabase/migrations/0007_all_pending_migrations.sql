-- ============================================================================
-- CMS SEO WP-Lite: PENDING MIGRATIONS BUNDLE
-- Jalankan SELURUH script ini di Supabase Dashboard -> SQL Editor -> Run
-- Script ini 100% IDEMPOTENT (aman dijalankan berkali-kali).
-- ============================================================================

-- 1. Optional Settings Columns (0003 & Home Copy)
alter table public.settings
  add column if not exists theme_template text not null default 'modern',
  add column if not exists google_site_verification text,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_message text,
  add column if not exists home_copy jsonb;

update public.settings
set theme_template = 'modern'
where theme_template is null;

-- 2. Articles Language & Redirects (0004)
alter table public.articles
  add column if not exists language text not null default 'id';

create index if not exists articles_lang_published_idx
  on public.articles (language, status, published_at desc);

update public.articles
set language = coalesce(
  (select language from public.settings order by created_at asc limit 1),
  'id'
)
where language is null or language = '';

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

-- Otomatis rekam redirect jika slug artikel diganti
create or replace function public.register_article_slug_redirect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_path text;
begin
  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    old_path := '/blog/' || old.slug;
    insert into public.redirects (from_path, to_path, status_code)
    values (old_path, '/blog/' || new.slug, 301)
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

-- 3. E-E-A-T Authors (0005)
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text,
  bio text,
  avatar_url text,
  credentials text[],
  social_links jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists authors_slug_idx on public.authors (slug);
alter table public.authors enable row level security;
drop policy if exists "authors_public_read" on public.authors;
create policy "authors_public_read" on public.authors
  for select to anon, authenticated using (true);

alter table public.articles
  add column if not exists author_id uuid references public.authors (id) on delete set null;

insert into public.authors (slug, name, role, bio, credentials)
values (
  'admin',
  'Editorial Team',
  'Lead Industry Researcher & Editor',
  'Tim editorial kami berdedikasi menyajikan riset terverifikasi, panduan mendalam, dan analisis berbasis data.',
  array['Certified Technical Researcher', 'Senior Content Specialist']
)
on conflict (slug) do nothing;

-- 4. Categories & Topic Clusters (0006)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  language text not null default 'id',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_slug_idx on public.categories (slug);
create index if not exists categories_lang_idx on public.categories (language);
alter table public.categories enable row level security;
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);

alter table public.articles
  add column if not exists category_id uuid references public.categories (id) on delete set null;

alter table public.articles
  add column if not exists category_slug text;

create index if not exists articles_category_slug_idx on public.articles (category_slug, status);

insert into public.categories (slug, name, description, language)
values
  ('panduan', 'Panduan & Tips', 'Kumpulan panduan komprehensif, tips praktis, dan ulasan teruji.', 'id'),
  ('berita-tren', 'Berita & Tren', 'Wawasan terkini dan analisis tren terbaru dalam industri.', 'id'),
  ('guides', 'Guides & Insights', 'Comprehensive walk-throughs, actionable tutorials and benchmarks.', 'en')
on conflict (slug) do nothing;

-- Muat ulang cache schema PostgREST Supabase
notify pgrst, 'reload schema';
