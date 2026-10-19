-- CMS SEO WP-Lite - optional settings columns
-- Jalankan script ini di Supabase SQL Editor untuk mengaktifkan fitur baru:
--   * tema tampilan (theme_template)
--   * kode verifikasi Google Search Console (google_site_verification)
--   * konfigurasi WhatsApp (whatsapp_number, whatsapp_message)
-- Script aman dijalankan berulang kali (idempotent).

alter table public.settings
  add column if not exists theme_template text not null default 'modern',
  add column if not exists google_site_verification text,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_message text;

update public.settings
set theme_template = 'modern'
where theme_template is null;

-- Refresh PostgREST schema cache agar kolom baru langsung terdeteksi.
notify pgrst, 'reload schema';
