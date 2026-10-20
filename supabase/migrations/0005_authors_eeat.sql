-- CMS SEO WP-Lite - P2: Authors & E-E-A-T Profiles
-- Jalankan di Supabase SQL Editor (aman diulang).

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

-- Link artikel ke author_id (opsional, fallback tetap ke string 'author')
alter table public.articles
  add column if not exists author_id uuid references public.authors (id) on delete set null;

-- Seed default author dari settings
insert into public.authors (slug, name, role, bio, credentials)
values (
  'admin',
  'Editorial Team',
  'Lead Industry Researcher & Editor',
  'Tim editorial kami berdedikasi menyajikan riset terverifikasi, panduan mendalam, dan analisis berbasis data untuk membantu pembaca membuat keputusan terbaik.',
  array['Certified Technical Researcher', 'Senior Content Specialist']
)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
