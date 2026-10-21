import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateArticles } from "@/lib/revalidate";
import { getSettings } from "@/lib/settings";
import { getOpenAI, chat, cosineSimilarity, type NineRouterConfig } from "@/lib/ai/client";
import {
  topicIdeasPrompt,
  outlinePrompt,
  sectionPrompt,
  seoMetaPrompt,
} from "@/lib/ai/prompts";
import { countWords, readingTimeMinutes, normalizeTitle } from "@/lib/text";
import { toSlug, withSuffix } from "@/lib/slug";
import type { ArticleStatus, Settings, Topic } from "@/types/db";

interface OutlineSection {
  heading: string;
  points: string[];
  words?: number;
}

interface Outline {
  title: string;
  sections: OutlineSection[];
}

interface SeoMeta {
  seo_title: string;
  seo_description: string;
  excerpt: string;
  keywords: string[];
}

interface TopicIdea {
  title: string;
  primary_keyword?: string;
  intent?: string;
  angle?: string;
}

function routerConfig(s: Settings): NineRouterConfig {
  if (!s.ninerouter_url) {
    throw new Error(
      "Endpoint 9Router belum diisi. Buka /admin/settings dan simpan konfigurasi dulu.",
    );
  }
  return { url: s.ninerouter_url, key: s.ninerouter_key ?? "" };
}

async function uniqueSlug(base: string): Promise<string> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("articles")
    .select("slug")
    .like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(withSuffix(base, n))) n++;
  return withSuffix(base, n);
}

/** Best-effort embedding. Returns null when no embedding model or it fails. */
async function tryEmbed(
  cfg: NineRouterConfig,
  model: string | null,
  text: string,
): Promise<number[] | null> {
  if (!model) return null;
  try {
    const client = getOpenAI(cfg);
    const res = await client.embeddings.create({ model, input: [text] });
    return (res.data[0]?.embedding as number[]) ?? null;
  } catch (err) {
    console.warn("embedding failed:", (err as Error).message);
    return null;
  }
}

function publishPaths(slug: string) {
  revalidateArticles(slug);
}

// ---------------------------------------------------------------------------
// Brainstorm
// ---------------------------------------------------------------------------

export interface BrainstormResult {
  created: number;
  skipped: number;
  sample: string[];
}

export async function runBrainstorm(count?: number): Promise<BrainstormResult> {
  const sb = createAdminClient();
  const settings = await getSettings();
  const cfg = routerConfig(settings);
  const n = Math.max(1, Math.min(count ?? settings.posts_per_run, 20));

  const { data: job } = await sb
    .from("generation_jobs")
    .insert({ type: "brainstorm", status: "running", model: settings.model_planner })
    .select("id")
    .single();
  const jobId = job?.id as string | undefined;

  try {
    const [{ data: topics }, { data: articles }] = await Promise.all([
      sb.from("topics").select("title"),
      sb.from("articles").select("title"),
    ]);
    const existing = [...(topics ?? []), ...(articles ?? [])].map((r) =>
      normalizeTitle(r.title as string),
    );
    const existingSet = new Set(existing);

    const prompt = topicIdeasPrompt(settings, n, (topics ?? []).map((r) => r.title as string));
    const res = await chat(cfg, {
      model: settings.model_planner,
      system: prompt.system,
      user: prompt.user,
      temperature: 0.9,
    });

    const ideas = extractIdeas(res.text);
    const rows = [];
    let skipped = 0;
    for (const idea of ideas) {
      const norm = normalizeTitle(idea.title);
      if (!idea.title || existingSet.has(norm)) {
        skipped++;
        continue;
      }
      existingSet.add(norm);
      rows.push({
        title: idea.title,
        primary_keyword: idea.primary_keyword ?? null,
        intent: idea.intent ?? null,
        angle: idea.angle ?? null,
        status: "idea" as const,
        source: "ai",
      });
    }

    if (rows.length) {
      const { error } = await sb.from("topics").insert(rows);
      if (error) throw new Error(error.message);
    }

    if (jobId) {
      await sb
        .from("generation_jobs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          prompt_tokens: res.promptTokens,
          completion_tokens: res.completionTokens,
          meta: { created: rows.length, skipped },
        })
        .eq("id", jobId);
    }

    return { created: rows.length, skipped, sample: rows.map((r) => r.title) };
  } catch (err) {
    const message = (err as Error).message;
    if (jobId) {
      await sb
        .from("generation_jobs")
        .update({ status: "error", finished_at: new Date().toISOString(), error: message })
        .eq("id", jobId);
    }
    throw err;
  }
}

function cleanNaturalTitle(raw: string): string {
  let t = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Judul:\s*/i, "")
    .trim();

  // If title has colon separator with excessive length (> 70 chars), keep the primary punchy part
  if (t.length > 70 && t.includes(":")) {
    const parts = t.split(":");
    // If the first part is substantial (>= 25 chars), use it directly
    if (parts[0].trim().length >= 25 && parts[0].trim().length <= 70) {
      t = parts[0].trim();
    } else {
      // Otherwise combine or truncate smartly
      t = t.slice(0, 68).trim().replace(/[\s,:;-]+$/, "");
    }
  } else if (t.length > 70) {
    t = t.slice(0, 68).trim().replace(/[\s,:;-]+$/, "");
  }

  return t;
}

function extractIdeas(raw: string): TopicIdea[] {
  // Reuse the chat client parser shape without importing the private helper.
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    const start = s.search(/[[{]/);
    const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    parsed = JSON.parse(s.slice(start, end + 1));
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : ((parsed as { topics?: unknown[] }).topics ?? []);
  return (arr as TopicIdea[])
    .filter((i) => i && typeof i.title === "string")
    .map((i) => ({
      ...i,
      title: cleanNaturalTitle(i.title),
    }));
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

export interface GenerateResult {
  articleId: string;
  slug: string;
  title: string;
  wordCount: number;
  status: ArticleStatus;
}

/** Pick the next topic: an explicit id, an approved one, or the newest idea. */
async function pickTopic(explicitId?: string): Promise<Topic | null> {
  const sb = createAdminClient();
  if (explicitId) {
    const { data } = await sb.from("topics").select("*").eq("id", explicitId).maybeSingle();
    return (data as Topic) ?? null;
  }
  for (const status of ["approved", "idea"] as const) {
    const { data } = await sb
      .from("topics")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) return data as Topic;
  }
  return null;
}

export async function runGenerate(topicId?: string): Promise<GenerateResult> {
  const sb = createAdminClient();
  const settings = await getSettings();
  const cfg = routerConfig(settings);

  const topic = await pickTopic(topicId);
  if (!topic) {
    throw new Error("Tidak ada topik untuk digenerate. Jalankan brainstorm dulu.");
  }

  const { data: job } = await sb
    .from("generation_jobs")
    .insert({
      type: "generate",
      status: "running",
      topic_id: topic.id,
      model: settings.model_writer,
    })
    .select("id")
    .single();
  const jobId = job?.id as string | undefined;

  let promptTokens = 0;
  let completionTokens = 0;

  try {
    // 1. Outline
    const outlinePromptMsg = outlinePrompt(settings, topic);
    const outlineRes = await chat(cfg, {
      model: settings.model_planner,
      system: outlinePromptMsg.system,
      user: outlinePromptMsg.user,
      temperature: 0.6,
    });
    promptTokens += outlineRes.promptTokens;
    completionTokens += outlineRes.completionTokens;

    const outline = extractOutline(outlineRes.text, topic.title);
    const outlineText = outline.sections
      .map((s, i) => `${i + 1}. ${s.heading}\n${s.points.map((p) => `   - ${p}`).join("\n")}`)
      .join("\n");

    // 2. Body, section by section
    const parts: string[] = [];
    let previousSummary = "";
    for (const section of outline.sections) {
      const msg = sectionPrompt(
        settings,
        topic,
        outline.title,
        outlineText,
        section.heading,
        section.points,
        section.words ?? 250,
        previousSummary,
      );
      const res = await chat(cfg, {
        model: settings.model_writer,
        system: msg.system,
        user: msg.user,
        temperature: 0.7,
      });
      promptTokens += res.promptTokens;
      completionTokens += res.completionTokens;
      const sectionMd = res.text.trim();
      parts.push(sectionMd);
      previousSummary = sectionMd.slice(-600);
    }

    let contentMd = parts.join("\n\n");

    // 3. SEO metadata
    const seoMsg = seoMetaPrompt(settings, {
      title: outline.title,
      content: contentMd,
      keyword: topic.primary_keyword ?? topic.title,
    });
    let seo: SeoMeta = {
      seo_title: outline.title.slice(0, 60),
      seo_description: "",
      excerpt: "",
      keywords: topic.primary_keyword ? [topic.primary_keyword] : [],
    };
    try {
      const seoRes = await chat(cfg, {
        model: settings.model_planner,
        system: seoMsg.system,
        user: seoMsg.user,
        temperature: 0.4,
      });
      promptTokens += seoRes.promptTokens;
      completionTokens += seoRes.completionTokens;
      seo = { ...seo, ...extractSeo(seoRes.text) };
    } catch (err) {
      console.warn("SEO metadata generation failed:", (err as Error).message);
    }

    // 4. Internal links from latest published articles
    const { data: related } = await sb
      .from("articles")
      .select("title,slug")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);
    if (related && related.length) {
      const links = related
        .map((r) => `- [${r.title}](/blog/${r.slug})`)
        .join("\n");
      contentMd += `\n\n## Baca juga\n\n${links}`;
    }

    // 5. Persist
    const words = countWords(contentMd);
    const baseSlug = toSlug(outline.title);
    const slug = await uniqueSlug(baseSlug);
    const embedding = await tryEmbed(
      cfg,
      settings.embedding_model,
      `${outline.title}\n${seo.excerpt}`,
    );

    const status: ArticleStatus = settings.auto_publish ? "published" : "draft";
    const now = new Date().toISOString();

    const insertPayload: Record<string, unknown> = {
      topic_id: topic.id,
      slug,
      title: outline.title,
      excerpt: seo.excerpt || contentMd.slice(0, 200),
      content_md: contentMd,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      keywords: seo.keywords,
      author: settings.default_author,
      status,
      published_at: status === "published" ? now : null,
      word_count: words,
      reading_time_minutes: readingTimeMinutes(words),
      model: settings.model_writer,
      embedding,
      language: "id",
      meta: { primary_keyword: topic.primary_keyword, intent: topic.intent },
    };

    let { data: article, error } = await sb
      .from("articles")
      .insert(insertPayload)
      .select("id,slug,title")
      .single();

    if (error && error.message.includes("column") && error.message.includes("language")) {
      delete insertPayload.language;
      const retry = await sb
        .from("articles")
        .insert(insertPayload)
        .select("id,slug,title")
        .single();
      article = retry.data;
      error = retry.error;
    }

    if (error || !article) throw new Error(error?.message || "Gagal membuat artikel.");

    await sb.from("topics").update({ status: "used" }).eq("id", topic.id);

    if (status === "published") publishPaths(slug);

    if (jobId) {
      await sb
        .from("generation_jobs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          article_id: article.id,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        })
        .eq("id", jobId);
    }

    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      wordCount: words,
      status,
    };
  } catch (err) {
    const message = (err as Error).message;
    if (jobId) {
      await sb
        .from("generation_jobs")
        .update({ status: "error", finished_at: new Date().toISOString(), error: message })
        .eq("id", jobId);
    }
    throw err;
  }
}

function extractOutline(raw: string, fallbackTitle: string): Outline {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: Outline;
  try {
    parsed = JSON.parse(s) as Outline;
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    parsed = JSON.parse(s.slice(start, end + 1)) as Outline;
  }
  if (!parsed.sections?.length) {
    // Fallback outline so a generation never fully fails on a parse hiccup.
    parsed = {
      title: parsed.title || fallbackTitle,
      sections: [
        { heading: "Pendahuluan", points: ["Latar belakang", "Mengapa penting"], words: 200 },
        { heading: "Pembahasan", points: ["Poin utama", "Contoh"], words: 500 },
        { heading: "Kesimpulan", points: ["Ringkasan", "Langkah berikutnya"], words: 200 },
      ],
    };
  }
  parsed.sections = parsed.sections.map((sec) => ({
    heading: sec.heading || "Bagian",
    points: Array.isArray(sec.points) ? sec.points : [],
    words: sec.words ?? 250,
  }));
  const rawTitle = parsed.title || fallbackTitle;
  return { title: cleanNaturalTitle(rawTitle), sections: parsed.sections };
}

function extractSeo(raw: string): Partial<SeoMeta> {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(s) as Partial<SeoMeta>;
    return {
      seo_title: parsed.seo_title?.slice(0, 70),
      seo_description: parsed.seo_description,
      excerpt: parsed.excerpt,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : undefined,
    };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Publish due articles
// ---------------------------------------------------------------------------

export interface PublishResult {
  published: number;
  slugs: string[];
}

export async function runPublishDue(): Promise<PublishResult> {
  const sb = createAdminClient();
  const now = new Date().toISOString();

  const { data: due, error } = await sb
    .from("articles")
    .select("id,slug")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);
  if (error) throw new Error(error.message);
  if (!due?.length) return { published: 0, slugs: [] };

  const slugs = due.map((a) => a.slug as string);
  const { error: updateError } = await sb
    .from("articles")
    .update({ status: "published", published_at: now })
    .in(
      "id",
      due.map((a) => a.id),
    );
  if (updateError) throw new Error(updateError.message);

  for (const slug of slugs) publishPaths(slug);
  publishPaths("");

  return { published: due.length, slugs };
}

// ---------------------------------------------------------------------------
// Auto-Translate Single or Next ID Article to English
// ---------------------------------------------------------------------------

export interface AutoTranslateResult {
  translated: boolean;
  message?: string;
  sourceArticle?: { id: string; title: string; slug: string };
  englishArticle?: { id: string; title: string; slug: string; status: string };
}

interface EnglishTranslationPayload {
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  excerpt: string;
  keywords: string[];
  content_md: string;
  word_count: number;
}

export async function runAutoTranslate(articleId?: string): Promise<AutoTranslateResult> {
  const sb = createAdminClient();
  const settings = await getSettings();
  const cfg = routerConfig(settings);

  // 1. Pick target Indonesian article
  let idArticle: any = null;

  if (articleId) {
    const { data, error } = await sb
      .from("articles")
      .select("id,title,content_md,excerpt,keywords,status,published_at,cover_image_url,author,category_slug")
      .eq("id", articleId)
      .single();
    if (error || !data) {
      return { translated: false, message: `Artikel ID ${articleId} tidak ditemukan.` };
    }
    idArticle = data;
  } else {
    // 1. Fetch all candidate Indonesian articles (published or draft)
    let candidatesQuery = sb
      .from("articles")
      .select("id,title,content_md,excerpt,keywords,status,published_at,cover_image_url,author,category_slug,language,translation_of")
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter language eq id or null (with schema safety fallback if language column absent)
    let { data: candidates, error } = await candidatesQuery.or("language.eq.id,language.is.null");
    if (error && error.message.includes("language")) {
      const retry = await sb
        .from("articles")
        .select("id,title,content_md,excerpt,keywords,status,published_at,cover_image_url,author,category_slug")
        .order("created_at", { ascending: false })
        .limit(50);
      candidates = (retry.data ?? []).map((r) => ({ ...r, language: "id", translation_of: null }));
      error = retry.error;
    }

    if (error || !candidates || candidates.length === 0) {
      return { translated: false, message: "Belum ada artikel ID yang tersedia di database untuk diterjemahkan." };
    }

    // Filter out any row that is itself already an EN article
    const idCandidates = candidates.filter((c) => !c.language || c.language === "id");

    if (idCandidates.length === 0) {
      return { translated: false, message: "Tidak ada konten ID yang ready. Translasi otomatis dihentikan (auto-stop)." };
    }

    // Get all EN translations that reference an ID article
    const { data: existingEn } = await sb
      .from("articles")
      .select("translation_of")
      .eq("language", "en")
      .not("translation_of", "is", null);

    const translatedIdSet = new Set((existingEn ?? []).map((e) => e.translation_of).filter(Boolean));

    // Find untranslated ID article
    idArticle = idCandidates.find((cand) => !translatedIdSet.has(cand.id));

    if (!idArticle) {
      return {
        translated: false,
        message: `Semua artikel ID (${idCandidates.length} artikel) sudah memiliki pasangan terjemahan English (100% translated). Tidak ada antrean baru.`,
      };
    }
  }

  // 2. Call AI to translate & adapt into English
  const model = settings.model_writer || "openai/gpt-4o";

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
TITLE: """${(idArticle.title || "").slice(0, 300)}"""
EXCERPT: """${(idArticle.excerpt || "").slice(0, 500)}"""
KEYWORDS: """${(idArticle.keywords || []).slice(0, 20).join(", ").slice(0, 300)}"""
CONTENT (MARKDOWN):
"""
${(idArticle.content_md || "").slice(0, 50000)}
"""`;

  const res = await chat(cfg, {
    model,
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.6,
  });

  const parsed = JSON.parse(
    res.text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim()
  ) as EnglishTranslationPayload;

  const content = (parsed.content_md || "").replace(/^#\s+[^\n]+(?:\r?\n|$)/, "").trim();
  const words = countWords(content);
  const baseSlug = toSlug(parsed.slug || parsed.title || "english-article", 5);
  const enSlug = await uniqueSlug(baseSlug);

  const targetStatus: ArticleStatus = idArticle.status === "published" ? "published" : "draft";
  const now = new Date().toISOString();

  const insertPayload: Record<string, unknown> = {
    title: parsed.title || "English Article",
    slug: enSlug,
    content_md: content,
    excerpt: parsed.excerpt || content.slice(0, 200),
    seo_title: parsed.seo_title || parsed.title || "",
    seo_description: parsed.seo_description || parsed.excerpt || "",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    author: idArticle.author || settings.default_author,
    category_slug: idArticle.category_slug || null,
    cover_image_url: idArticle.cover_image_url || null,
    language: "en",
    translation_of: idArticle.id,
    status: targetStatus,
    published_at: targetStatus === "published" ? (idArticle.published_at || now) : null,
    word_count: words,
    reading_time_minutes: readingTimeMinutes(words),
    model,
  };

  let { data: newEn, error } = await sb
    .from("articles")
    .insert(insertPayload)
    .select("id,slug,title,status")
    .single();

  if (error && error.message.includes("translation_of")) {
    delete insertPayload.translation_of;
    const retry = await sb.from("articles").insert(insertPayload).select("id,slug,title,status").single();
    newEn = retry.data;
    error = retry.error;
  }

  if (error || !newEn) {
    throw new Error(error?.message || "Gagal menyimpan artikel hasil translate EN.");
  }

  if (targetStatus === "published") {
    publishPaths(newEn.slug);
  }

  return {
    translated: true,
    sourceArticle: { id: idArticle.id, title: idArticle.title, slug: idArticle.slug },
    englishArticle: { id: newEn.id, title: newEn.title, slug: newEn.slug, status: newEn.status },
  };
}

export { cosineSimilarity };
