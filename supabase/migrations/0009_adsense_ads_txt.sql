-- CMS SEO - Optional Google AdSense and ads.txt settings
-- Script idempotent (aman dijalankan berulang kali).

alter table public.settings
  add column if not exists adsense_client_id text,
  add column if not exists ads_txt text;

update public.settings
set
  adsense_client_id = coalesce(adsense_client_id, 'ca-pub-5979323216501634'),
  ads_txt = coalesce(ads_txt, 'google.com, pub-5979323216501634, DIRECT, f08c47fec0942fa0')
where adsense_client_id is null or ads_txt is null;

-- Refresh PostgREST schema cache agar kolom baru langsung aktif
notify pgrst, 'reload schema';
