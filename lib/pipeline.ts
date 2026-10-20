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
  return (arr as TopicIdea[]).filter((i) => i && typeof i.title === "string");
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

    let contentMd = `# ${outline.title}\n\n${parts.join("\n\n")}`;

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
  return { title: parsed.title || fallbackTitle, sections: parsed.sections };
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
export { cosineSimilarity };
