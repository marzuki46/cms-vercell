import type { Settings, Topic } from "@/types/db";

function languageName(code: string): string {
  if (code === "id") return "Bahasa Indonesia";
  if (code === "en") return "English";
  return code;
}

function brandContext(s: Settings): string {
  return [
    s.site_name ? `Website: ${s.site_name}` : "",
    s.niche ? `Niche: ${s.niche}` : "",
    s.audience ? `Target audience: ${s.audience}` : "",
    s.brand_voice ? `Brand voice: ${s.brand_voice}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function topicIdeasPrompt(
  s: Settings,
  count: number,
  existingTitles: string[],
): { system: string; user: string } {
  const lang = languageName(s.language);
  const existing = existingTitles.length
    ? existingTitles.map((t) => `- ${t}`).join("\n")
    : "(none yet)";

  const system = `Kamu adalah content editor dan copywriter media online profesional di bidang teknologi, programming, PC/laptop hardware, cybersecurity, dan web development. Kamu menyusun ide judul artikel blog yang ringkas, natural, berbobot, ramah pembaca, dan optimal untuk Google Search Console. Tulis SEMUA output dalam ${lang}.`;

  const user = `Rancang ${count} ide artikel blog yang BARU dan tidak duplikat.

${brandContext(s)}

FOKUS AREA TOPIK TEKNOLOGI & IT:
1. Pemrograman & Coding (JavaScript, TypeScript, Python, Framework Modern, API, Database).
2. Hardware, PC & Laptop Workstation (Setup kerja developer, spesifikasi laptop programming, optimasi PC).
3. Cybersecurity & Keamanan Data (Proteksi malware, hardening server, SSL/HTTPS, keamanan website).
4. Web & Cloud Infrastructure (Hosting, VPS, migrasi cloud, SEO teknis).

DISTRIBUSI CORONG KONTEN (CONTENT MARKETING FUNNEL):
Dari ${count} ide yang kamu buat, distribusikan secara seimbang ke 3 tahap funnel berikut:
- TOFU (Top of Funnel / Edukasi & Awareness): Membahas konsep dasar, apa itu, panduan pemula, tren teknologi, tips umum. Intent: "informational" atau "tofu".
- MOFU (Middle of Funnel / Evaluasi & Pertimbangan): Perbandingan teknologi (X vs Y), review arsitektur, checklist pemilihan tool/stack, panduan teknis mendalam pemecahan masalah. Intent: "commercial" atau "mofu".
- BOFU (Bottom of Funnel / Keputusan & Konversi): Jasa pembuatan sistem, biaya setup/migrasi, studi kasus implementasi nyata bisnis, audit keamanan, konsultasi ahli. Intent: "transactional" atau "bofu".

Artikel yang sudah ada (JANGAN ulangi topik yang sama):
${existing}

ATURAN KETAT FORMAT JUDUL (NATURAL & MANUSIAWI):
1. BATAS PANJANG: Judul WAJIB antara 45 sampai 65 karakter (maksimal 70 karakter). Jangan pernah membuat judul lebih dari 70 karakter.
2. HINDARI GAYA ROBOT / AI:
   - DILARANG menggunakan format titik dua bertumpuk (contoh buruk: "Panduan X: Cara Y Tanpa Z").
   - DILARANG menggunakan kata-kata klise AI seperti: "Mesin Konversi", "Rombak UI Jadul", "Tanpa SaaS Bulanan", "Menyelami", "Mengupas Tuntas", "Komprehensif".
3. TULIS SECARA NATURAL DAN RINGKAS layaknya jurnalis atau praktisi profesional.
   Contoh bagus per funnel:
   - TOFU: "Memahami Cara Kerja Event Loop JavaScript untuk Pemula" (55 karakter)
   - MOFU: "Perbandingan Supabase vs PostgreSQL Mandiri untuk Startup" (57 karakter)
   - BOFU: "Estimasi Biaya Pembuatan Website Sekolah dan Portal LMS" (55 karakter)
4. Punya kata kunci utama (primary keyword) yang realistis dicari pengguna.
5. intent: salah satu dari "tofu", "mofu", "bofu" (atau "informational", "commercial", "transactional").

Balas HANYA dengan JSON array valid, tanpa penjelasan, dengan skema:
[{ "title": string, "primary_keyword": string, "intent": "tofu" | "mofu" | "bofu", "angle": string }]`;

  return { system, user };
}

export function outlinePrompt(
  s: Settings,
  topic: Topic,
): { system: string; user: string } {
  const lang = languageName(s.language);
  const system = `Kamu adalah editor konten dan copywriter profesional. Buat kerangka artikel yang mendalam dan terstruktur. Tulis dalam ${lang}.`;
  const user = `Buat kerangka (outline) untuk artikel blog.

${brandContext(s)}

Topik: ${topic.title}
Kata kunci utama: ${topic.primary_keyword ?? "-"}
Sudut pandang: ${topic.angle ?? "-"}
Tahap Funnel / Intent: ${topic.intent ?? "general"}

PANDUAN CORONG (FUNNEL STRATEGY):
- Jika TOFU/Informational: Tekankan edukasi pembaca, pemahaman konsep fundamental, dan solusi langkah demi langkah tanpa hard-selling.
- Jika MOFU/Commercial: Berikan evaluasi komparatif, kelebihan vs kekurangan, arsitektur sistem, dan checklist pemilihan solusi.
- Jika BOFU/Transactional: Bahas aspek bisnis nyata, efisiensi operasional, estimasi biaya/waktu pengerjaan, dan Call to Action (CTA) konsultasi di akhir.

ATURAN JUDUL ARTIKEL:
- Panjang judul "title" harus ringkas, maksimal 65 karakter, natural, dan bebas dari format AI klise/titik dua panjang.

Aturan Bagian:
- 5 sampai 7 bagian utama (H2).
- Setiap H2 punya 2 sampai 4 sub-poin (H3).
- Bagian pembuka dan penutup ringkas & langsung ke inti pembahasan.
- Target total ~1200 - 1500 kata.

Balas HANYA dengan JSON valid:
{
  "title": string,
  "sections": [
    { "heading": string, "points": [string], "words": number }
  ]
}`;
  return { system, user };
}

export function sectionPrompt(
  s: Settings,
  topic: Topic,
  articleTitle: string,
  outline: string,
  sectionHeading: string,
  points: string[],
  targetWords: number,
  previousSummary: string,
): { system: string; user: string } {
  const lang = languageName(s.language);
  const system = `Kamu penulis SEO berpengalaman. Tulis prosa yang jelas, informatif, dan mengalir. Hindari basa-basi, klise, dan pengulangan. Tulis dalam ${lang}. Gunakan format Markdown.`;
  const user = `Tulis SATU bagian artikel berikut. Jangan mengulang judul artikel atau bagian lain.

${brandContext(s)}

Judul artikel: ${articleTitle}
Topik: ${topic.title}
Kata kunci utama: ${topic.primary_keyword ?? "-"}

Kerangka keseluruhan:
${outline}

${previousSummary ? `Ringkasan bagian sebelumnya:\n${previousSummary}\n` : ""}

Sekarang tulis bagian dengan heading: "${sectionHeading}"
Poin yang harus dibahas:
${points.map((p) => `- ${p}`).join("\n")}

Aturan:
- Mulai dengan "## ${sectionHeading}".
- Sub-judul boleh pakai "### " bila membantu.
- Panjang sekitar ${targetWords} kata. Gunakan paragraf pendek.
- Sertakan contoh atau detail konkret bila relevan.
- Jangan menulis kesimpulan/penutup di sini kecuali ini memang bagian kesimpulan.

Balas dengan Markdown saja, tanpa penjelasan tambahan.`;
  return { system, user };
}

export function seoMetaPrompt(
  s: Settings,
  article: { title: string; content: string; keyword: string },
): { system: string; user: string } {
  const lang = languageName(s.language);
  const system = `Kamu spesialis SEO on-page. Tulis dalam ${lang}.`;
  const user = `Berdasarkan artikel berikut, buat metadata SEO.

Judul: ${article.title}
Kata kunci utama: ${article.keyword}

Cuplikan isi:
${article.content.slice(0, 4000)}

Balas HANYA JSON valid:
{
  "seo_title": string (<= 60 karakter),
  "seo_description": string (120-155 karakter),
  "excerpt": string (1-2 kalimat),
  "keywords": [string] (5-8 kata kunci sekunder)
}`;
  return { system, user };
}
