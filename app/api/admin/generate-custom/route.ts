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
  ctaType?: "whatsapp" | "link" | "custom" | "none";
  ctaText?: string;
  ctaTarget?: string; // nomor WhatsApp atau URL tujuan
  ctaInstruction?: string;
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

  // Konfigurasi Target CTA dari request atau fallback ke database settings
  const ctaType = body.ctaType || (settings.whatsapp_number ? "whatsapp" : "none");
  const ctaNumber = (body.ctaTarget || settings.whatsapp_number || "").replace(/\D/g, "");
  const ctaLabel = body.ctaText || "Konsultasi Sekarang via WhatsApp";
  const customCtaInstruction = body.ctaInstruction || "";

  let ctaGuideline = "";
  if (ctaType === "whatsapp" && ctaNumber) {
    const waUrl = `https://wa.me/${ctaNumber}?text=Halo%20Admin,%20saya%20tertarik%20dengan%20informasi%20ini`;
    ctaGuideline = `PENTING - INTEGRASI CALL TO ACTION (CTA) WHATSAPP:
- Tujuan Konversi: Mengarahkan pembaca untuk berkonsultasi / pesan via WhatsApp resmi (${ctaNumber}).
- Masukkan Call To Action (CTA) yang sangat persuasif dan kontekstual:
  1. Satu CTA soft-selling di tengah artikel (setelah pembahasan manfaat/solusi).
  2. Satu CTA strong-selling di akhir artikel (bagian penutup/kesimpulan).
- Format link tombol CTA di Markdown wajib mengarah ke tautan: [${ctaLabel}](${waUrl})
- Beri kalimat pengantar yang relevan dan mendesak (urgency / scarcity / diskon / bonus konsultasi).`;
  } else if (ctaType === "link" && body.ctaTarget) {
    ctaGuideline = `PENTING - INTEGRASI CALL TO ACTION (CTA) LINK TUJUAN:
- Tujuan Konversi: Mengarahkan pembaca ke URL tujuan: ${body.ctaTarget}
- Masukkan link CTA di bagian tengah dan penutup artikel dengan teks jangkar yang kuat: [${ctaLabel}](${body.ctaTarget})`;
  } else if (ctaType === "custom" && customCtaInstruction) {
    ctaGuideline = `PENTING - INTEGRASI CALL TO ACTION (CTA) KHUSUS:
${customCtaInstruction}`;
  }

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

  const systemPrompt = `Anda adalah seorang Master SEO Content Strategist & Senior Conversion Copywriter.
Kembangkan topik dari pengguna menjadi artikel blog SEO mendalam dan komprehensif.
ATURAN OUTPUT:
Keluarkan HASIL AKHIR HANYA dalam format JSON valid tanpa teks pengantar atau markdown block apapun dengan struktur skema:
{
  "title": "Judul artikel yang menarik klik (Click-worthy & SEO optimized)",
  "seo_title": "Title tag untuk Google (maks 60 karakter)",
  "seo_description": "Meta deskripsi persuasif (maks 155 karakter)",
  "excerpt": "Ringkasan artikel 2-3 kalimat",
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "content_md": "Isi lengkap artikel dalam format Markdown (mulai langsung dari ## atau paragraf intro, tanpa judul # H1 terpisah), bullet points, CTA link yang rapi..."
}`;

  const userPrompt = `INPUT AWAL DARI PENGGUNA (TOPIK / PARAGRAF):
"""
${input.slice(0, 10000)}
"""

PANDUAN RISET ENTITY & KEYWORD:
"""
${keywordInstruction.slice(0, 3000)}
"""

PANDUAN PENGEMBANGAN KONTEN:
"""
${contentInstruction.slice(0, 5000)}
"""

${ctaGuideline ? `INSTRUKSI KONVERSI TRAFIK & CALL TO ACTION (CTA):\n"""\n${ctaGuideline.slice(0, 3000)}\n"""\n` : ""}`;

  try {
    const res = await chat(cfg, {
      model,
      system: systemPrompt,
      user: userPrompt,
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
