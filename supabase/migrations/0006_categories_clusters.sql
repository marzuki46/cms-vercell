-- CMS SEO WP-Lite - P3: Categories & Topic Clusters
-- Jalankan di Supabase SQL Editor (aman diulang).

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

-- Kolom category_id dan category_slug di articles
alter table public.articles
  add column if not exists category_id uuid references public.categories (id) on delete set null;

alter table public.articles
  add column if not exists category_slug text;

create index if not exists articles_category_slug_idx on public.articles (category_slug, status);

-- Seed kategori umum
insert into public.categories (slug, name, description, language)
values
  ('panduan', 'Panduan & Tips', 'Kumpulan panduan komprehensif, tips praktis, dan ulasan teruji.', 'id'),
  ('berita-tren', 'Berita & Tren', 'Wawasan terkini dan analisis tren terbaru dalam industri.', 'id'),
  ('guides', 'Guides & Insights', 'Comprehensive walk-throughs, actionable tutorials and benchmarks.', 'en')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
