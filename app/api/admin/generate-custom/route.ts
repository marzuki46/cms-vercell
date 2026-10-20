import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { chat, extractJson } from "@/lib/ai/client";
import { countWords } from "@/lib/text";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

interface RequestBody {
  topicOrParagraph: string;
  keywordPrompt?: string;
  contentPrompt?: string;
  model?: string;
}

interface GeneratedResult {
  title: string;
  content_md: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
  word_count: number;
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format JSON tidak valid.", 400);
  }

  const input = (body.topicOrParagraph ?? "").trim();
  if (!input) {
    return jsonError("Topik atau paragraf awal wajib diisi.", 400);
  }

  const settings = await getSettings();
  if (!settings.ninerouter_url) {
    return jsonError("URL 9Router belum dikonfigurasi di Pengaturan Situs.", 400);
  }

  const cfg = {
    url: settings.ninerouter_url,
    key: settings.ninerouter_key ?? "",
  };

  const model = body.model || settings.model_writer || "openai/gpt-4o";

  // Default SEO entity & keyword prompt if custom prompt not provided
  const keywordInstruction = (body.keywordPrompt ?? "").trim() ||
    `Analisis input topik/paragraf berikut dan identifikasi:
1. Primary keyword (kata kunci utama SEO)
2. 5-8 Entity keywords (LSI / semantik entities) yang wajib tercakup
3. Search intent (informational/commercial/transactional)
Bahasa: ${settings.language === "en" ? "English" : "Bahasa Indonesia"}`;

  // Default content expansion prompt if custom prompt not provided
  const contentInstruction = (body.contentPrompt ?? "").trim() ||
    `Kembangkan input di atas menjadi artikel blog SEO mendalam dan komprehensif (minimal 800 kata).
Gunakan struktur heading Markdown yang rapi (# untuk judul utama, ## untuk sub-judul, ### untuk detail).
Sertakan bullet points, tips praktis, dan bahasa yang ramah pembaca dan mudah dipahami.
Optimalkan untuk Google Helpful Content & E-E-A-T.
Bahasa: ${settings.language === "en" ? "English" : "Bahasa Indonesia"}`;

  const prompt = `Anda adalah seorang Master SEO Content Strategist & Senior Tech/Automotive/Business Writer.

INPUT AWAL DARI PENGGUNA (TOPIK / PARAGRAF):
"""
${input}
"""

PANDUAN RISET ENTITY & KEYWORD:
"""
${keywordInstruction}
"""

PANDUAN PENGEMBANGAN KONTEN:
"""
${contentInstruction}
"""

ATURAN OUTPUT:
Keluarkan HASIL AKHIR HANYA dalam format JSON valid tanpa teks pengantar atau penutup apapun dengan struktur skema berikut:
{
  "title": "Judul artikel yang menarik klik (Click-worthy & SEO optimized)",
  "seo_title": "Title tag untuk Google (maks 60 karakter)",
  "seo_description": "Meta deskripsi persuasif (maks 155 karakter)",
  "excerpt": "Ringkasan artikel 2-3 kalimat",
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "content_md": "Isi lengkap artikel dalam format Markdown lengkap dengan heading #, ##, ###, bullet points, dan pembahasan mendalam..."
}`;

  try {
    const res = await chat(cfg, {
      model,
      user: prompt,
      temperature: 0.7,
    });

    const parsed = extractJson<GeneratedResult>(res.text);
    const content = parsed.content_md || "";
    const words = countWords(content);

    return NextResponse.json({
      success: true,
      result: {
        title: parsed.title || "Artikel Baru",
        seo_title: parsed.seo_title || parsed.title || "",
        seo_description: parsed.seo_description || parsed.excerpt || "",
        excerpt: parsed.excerpt || "",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        content_md: content,
        word_count: words,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Gagal memproses AI: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
