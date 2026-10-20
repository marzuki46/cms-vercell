-- CMS SEO WP-Lite - i18n, slug redirects and article language
-- Jalankan di Supabase SQL Editor (aman diulang).

-- ---------------------------------------------------------------------------
-- 1. Language per artikel
-- ---------------------------------------------------------------------------
alter table public.articles
  add column if not exists language text not null default 'id';

create index if not exists articles_lang_published_idx
  on public.articles (language, status, published_at desc);

-- Backfill: artikel lama mengikuti bahasa utama situs.
update public.articles
set language = coalesce(
  (select language from public.settings order by created_at asc limit 1),
  'id'
)
where language is null or language = '';

-- ---------------------------------------------------------------------------
-- 2. Tabel redirect permanen (301)
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

-- ---------------------------------------------------------------------------
-- 3. Otomatis buat redirect saat slug artikel berubah
-- ---------------------------------------------------------------------------
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

notify pgrst, 'reload schema';
