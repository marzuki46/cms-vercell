-- Content Autopilot - initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- settings (singleton row)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  site_name text,
  site_url text,
  language text not null default 'id',
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.settings (singleton) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- topics
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  primary_keyword text,
  intent text,
  angle text,
  status text not null default 'idea'
    check (status in ('idea', 'approved', 'used', 'rejected')),
  score integer,
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_status_idx on public.topics (status, created_at desc);

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
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
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'archived')),
  published_at timestamptz,
  scheduled_for timestamptz,
  cover_image_url text,
  reading_time_minutes integer,
  word_count integer,
  model text,
  embedding jsonb,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);
create index if not exists articles_scheduled_idx
  on public.articles (status, scheduled_for);

-- ---------------------------------------------------------------------------
-- generation_jobs
-- ---------------------------------------------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('brainstorm', 'generate', 'publish')),
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
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

create index if not exists generation_jobs_started_idx
  on public.generation_jobs (started_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.topics enable row level security;
alter table public.articles enable row level security;
alter table public.generation_jobs enable row level security;

-- Public (anon + authenticated) may read published articles only.
drop policy if exists "articles_public_read_published" on public.articles;
create policy "articles_public_read_published"
  on public.articles
  for select
  using (status = 'published');

-- settings / topics / generation_jobs: no policies on purpose.
-- The service_role key bypasses RLS and is the only way in.
