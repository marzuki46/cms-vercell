-- ============================================================================
-- Migration 0008: Translation Pairs & Backup Support
-- Jalankan di Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Pastikan kolom language ada dan indexnya siap
alter table public.articles
  add column if not exists language text not null default 'id';

create index if not exists articles_lang_published_idx
  on public.articles (language, status, published_at desc);

-- 2. Kolom relasi terjemahan artikel (translation_of)
-- Menghubungkan artikel EN dengan artikel sumber ID, atau sebaliknya
alter table public.articles
  add column if not exists translation_of uuid references public.articles (id) on delete set null;

create index if not exists articles_translation_of_idx
  on public.articles (translation_of);

-- 3. Perbaiki artikel berbahasa Inggris yang sempat tersimpan dengan language = 'id'
update public.articles
set language = 'en'
where slug = 'website-migration-seo-checklist'
   or slug like '%-en'
   or title ilike '%How to Migrate%';

-- 4. Hubungkan artikel cara-migrasi-website-tanpa-drop (ID) dengan website-migration-seo-checklist (EN)
update public.articles
set translation_of = (
  select id from public.articles where slug = 'cara-migrasi-website-tanpa-drop' limit 1
)
where slug = 'website-migration-seo-checklist';
