# CMS SEO — Auto-generate long-form SEO blog

Next.js 16 (App Router) + Supabase + 9Router. Brainstorm topik, generate artikel
long-form SEO, review draft di admin, lalu publish. Semua metadata, sitemap,
robots, dan RSS dibuat otomatis.

## Fitur

- **Brainstorm topik** oleh AI (anti-duplikat dengan topik & artikel yang sudah ada).
- **Generate artikel long-form**: outline → tulis per bagian → metadata SEO → simpan sebagai draft.
- **Admin review**: setujui topik, generate, edit konten (markdown + pratinjau), publish/jadwalkan/arsipkan.
- **Public site SSR/ISR** yang SEO-friendly: halaman artikel dengan `generateMetadata` + JSON-LD (BlogPosting + Breadcrumb), Canonical, Open Graph.
- **Sitemap & robots.txt otomatis** (`/sitemap.xml`, `/robots.txt`) + **RSS** (`/rss.xml`).
- **Penjadwalan**: Vercel Cron untuk publish otomatis; QStash opsional sebagai pengganti/penguat.
- **9Router via UI**: endpoint, model, dan API key diatur dari halaman `/admin/settings` (disimpan di tabel `settings`, bukan env). API key dimask saat ditampilkan.
- **WhatsApp lead capture**: pengunjung mengisi nomor di tombol WhatsApp, lead tercatat di Supabase, lalu diarahkan ke chat WhatsApp. Kelola dari `/admin/leads`.

## Arsitektur singkat

- `app/(public)` — beranda, `/blog`, `/blog/page/[page]`, `/blog/[slug]`, `sitemap.ts`, `robots.ts`, `rss.xml/route.ts`.
- `app/admin/(dash)` — dashboard admin (guarded). `app/admin/login` — Supabase Auth.
- `app/api/admin/*` — operasi admin (service-role).
- `app/api/cron/*` — endpoint terjadwal (brainstorm/generate/publish).
- `proxy.ts` — middleware Next 16 (guard `/admin/*` + refresh sesi Supabase).
- `lib/pipeline.ts` — orkestrasi brainstorm & generate.
- `lib/ai/*` — klien 9Router (OpenAI-compatible) + prompt.
- `lib/content.ts` — pembacaan publik (anon, RLS; fallback aman saat build tanpa env).
- `supabase/migrations/0001_init.sql` + `0002_whatsapp.sql` — skema, leads, dan RLS.

### Model data

- `settings` (singleton): konfigurasi 9Router, model, brand voice, `auto_publish`.
- `topics`: `idea | approved | used | rejected`.
- `articles`: `draft | scheduled | published | archived`, `published_at`, `scheduled_for`, `embedding (jsonb)`, `keywords text[]`.
- `generation_jobs`: log setiap run (`running | success | error`, token usage).
- `whatsapp_leads`: lead pengunjung dengan status `new | contacted | closed`, halaman sumber, pesan, dan catatan internal.

## Setup

### 1. Environment

Salin `.env.example` → `.env.local` dan isi:

| Var | Wajib | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ya | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | anon key (aman di browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | server-only, jangan pernah diekspos |
| `NEXT_PUBLIC_SITE_URL` | ya | URL publik (sitemap/canonical/RSS) |
| `ADMIN_EMAILS` | ya | daftar email admin (dipisah koma) |
| `CRON_SECRET` | ya | bearer secret untuk `/api/cron/*` |
| `QSTASH_TOKEN` / `QSTASH_*_SIGNING_KEY` | opsional | verifikasi signature QStash |

> Build tetap berjalan tanpa env (data publik kosong), tetapi admin & generate butuh Supabase.

### 2. Database

Jalankan `supabase/migrations/0001_init.sql`, lalu `supabase/migrations/0002_whatsapp.sql` di SQL editor Supabase (atau `supabase db push`).
Buat user admin di **Authentication → Users** dengan email yang ada di `ADMIN_EMAILS`.

### 3. Konfigurasi 9Router di aplikasi

1. `npm run dev` → buka `/admin` → login.
2. **Pengaturan** → isi Endpoint 9Router, API key, model penulis/planner → **Tes koneksi** → **Simpan**.
3. **Pengaturan** → bagian **WhatsApp** → isi nomor bisnis dan pesan pembuka → **Simpan pengaturan**.
4. **Ringkasan** → *Brainstorm topik* → lalu *Generate 1 artikel* (atau dari halaman **Topik**).
5. Review draft di **Artikel**, edit bila perlu, lalu **Simpan & Publish**.
6. Lead dari pengunjung masuk ke **Lead WA**. Dari sana Anda bisa membuka chat visitor, mengubah status, dan menambahkan catatan internal.

### Alur WhatsApp

- Tombol WhatsApp muncul di homepage, daftar blog, dan halaman artikel.
- Visitor mengisi nomor WhatsApp, nama, dan pesan opsional.
- Server mencatat halaman sumber, artikel, referrer, user-agent, dan status lead.
- Setelah tersimpan, visitor diarahkan ke `wa.me/<nomor-bisnis>` dengan pesan pembuka otomatis.
- Bila Supabase belum dikonfigurasi, chat tetap bisa dipakai tetapi lead belum dapat direkam.

### 4. Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint         # eslint
npm run typecheck    # next typegen + tsc --noEmit
npm run build        # produksi
```

## Penjadwalan (Vercel Cron)

`vercel.json` mendefinisikan cron:

- `/api/cron/publish` — `*/15 * * * *` (publish artikel `scheduled` yang jatuh tempo)
- `/api/cron/generate` — `0 */6 * * *`
- `/api/cron/brainstorm` — `0 2 * * *`

Vercel otomatis mengirim `Authorization: Bearer $CRON_SECRET` bila `CRON_SECRET` diset.
> Plan Hobby hanya mengizinkan 1 cron harian — sesuaikan jadwal bila perlu.

Alternatif/manual:

```bash
curl -X POST https://<site>/api/cron/generate -H "Authorization: Bearer $CRON_SECRET"
```

QStash: endpoint yang sama juga memverifikasi header `upstash-signature`, jadi bisa
dijadwalkan lewat QStash (retry + observability lebih baik).

## Deploy ke Vercel

```bash
npm i -g vercel
vercel            # tautkan project
vercel --prod     # deploy
```

Set semua env var di dashboard Vercel, lalu jalankan migrasi di Supabase.

## Catatan Next.js 16

- `params`/`searchParams` adalah Promise — selalu `await`.
- Middleware bernama `proxy.ts` (mengekspor `proxy`) dengan runtime Node.
- Model caching klasik dipakai (`export const revalidate`, `unstable_cache`, `revalidatePath`).
- Dokumentasi lokal: `node_modules/next/dist/docs/`.
