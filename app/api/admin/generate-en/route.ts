import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { chat, extractJson } from "@/lib/ai/client";
import { countWords } from "@/lib/text";
import { toSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

interface RequestBody {
  idTitle: string;
  idContent: string;
  idExcerpt?: string;
  idKeywords?: string[];
  ctaText?: string;
  ctaTarget?: string;
  model?: string;
}

interface EnglishResult {
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  excerpt: string;
  keywords: string[];
  content_md: string;
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

  const { idTitle, idContent } = body;
  if (!idTitle?.trim() || !idContent?.trim()) {
    return jsonError("Judul dan konten versi Indonesia wajib ada sebelum translate ke EN.", 400);
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

  const systemPrompt = `You are an elite bilingual SEO Content Strategist and Native English Tech/Business/Automotive Copywriter.
Translate and adapt the user's Indonesian article into native, engaging, high-ranking ENGLISH content for a global audience.
Strictly adhere to system guidelines:
1. Native English Adaptation: Do not perform a literal word-for-word translation. Adapt the tone to be fluent, authoritative, and natural American/International English.
2. Heading Structure (Strict SEO): Do NOT output a leading # Title in content_md (the page template already renders the canonical H1 title). Start directly with the introduction or ## First Heading. Keep all sub-headings (##, ###), bullet lists, and tables intact.
3. Call-To-Action (CTA): Adapt any Call-To-Action links or buttons into natural English.
4. Concise Keyword-Focused Slug: Provide a short URL slug (strictly 3 to 5 core English words, maximum 45 characters, no stop words, URL safe).
5. Output Format: Return ONLY a valid JSON object matching this schema without any preamble:
{
  "title": "Compelling English Click-Worthy & SEO Title",
  "slug": "short-core-keyword-slug",
  "seo_title": "Google Title Tag (max 60 chars)",
  "seo_description": "Compelling meta description (max 155 chars)",
  "excerpt": "English summary in 2-3 sentences",
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"],
  "content_md": "Full translated English article in Markdown..."
}`;

  const userPrompt = `ORIGINAL INDONESIAN ARTICLE:
TITLE: """${idTitle.slice(0, 300)}"""
EXCERPT: """${(body.idExcerpt || "").slice(0, 500)}"""
KEYWORDS: """${(body.idKeywords || []).slice(0, 20).join(", ").slice(0, 300)}"""
CONTENT (MARKDOWN):
"""
${idContent.slice(0, 50000)}
"""`;

  try {
    const res = await chat(cfg, {
      model,
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.6,
    });

    const parsed = extractJson<EnglishResult>(res.text);
    // Strip redundant leading # H1 if AI included it
    const content = (parsed.content_md || "").replace(/^#\s+[^\n]+(?:\r?\n|$)/, "").trim();
    const words = countWords(content);
    // Enforce concise keyword slug
    const cleanSlug = toSlug(parsed.slug || parsed.title || "english-article", 5);

    return NextResponse.json({
      success: true,
      result: {
        title: parsed.title || "English Article",
        slug: cleanSlug,
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
      { error: `Gagal generate versi EN: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
