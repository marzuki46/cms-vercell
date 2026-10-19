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

  const system = `Kamu adalah content strategist SEO senior. Kamu merancang ide artikel blog long-form yang berorientasi search intent dan punya peluang ranking. Tulis SEMUA output dalam ${lang}.`;

  const user = `Rancang ${count} ide artikel blog long-form yang BARU dan tidak duplikat.

${brandContext(s)}

Artikel yang sudah ada (JANGAN ulangi topik yang sama):
${existing}

Kriteria tiap ide:
- Judul spesifik, bukan generik, dan menjanjikan manfaat jelas.
- Punya kata kunci utama (primary keyword) yang realistis dicari orang.
- Punya sudut pandang (angle) yang membedakan dari artikel sejenis.
- intent: salah satu dari "informational", "commercial", "transactional", "navigational".

Balas HANYA dengan JSON array valid, tanpa penjelasan, dengan skema:
[{ "title": string, "primary_keyword": string, "intent": string, "angle": string }]`;

  return { system, user };
}

export function outlinePrompt(
  s: Settings,
  topic: Topic,
): { system: string; user: string } {
  const lang = languageName(s.language);
  const system = `Kamu adalah penulis dan editor konten SEO. Buat kerangka artikel yang mendalam dan terstruktur. Tulis dalam ${lang}.`;
  const user = `Buat kerangka (outline) untuk artikel blog long-form.

${brandContext(s)}

Topik: ${topic.title}
Kata kunci utama: ${topic.primary_keyword ?? "-"}
Sudut pandang: ${topic.angle ?? "-"}

Aturan:
- 5 sampai 8 bagian utama (H2).
- Setiap H2 punya 2 sampai 4 sub-poin (yang layak jadi H3 atau poin bahasan).
- Sertakan bagian pembuka yang kuat dan bagian kesimpulan.
- Target total ~1500 kata.

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
