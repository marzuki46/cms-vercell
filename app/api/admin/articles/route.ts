import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSlug, withSuffix } from "@/lib/slug";
import { countWords, readingTimeMinutes } from "@/lib/text";
import { revalidateArticles } from "@/lib/revalidate";
import { notifySearchEngines } from "@/lib/indexer";
import type { ArticleStatus } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: ArticleStatus[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const limit = Math.min(Number(sp.get("limit")) || 20, 200);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);

  const selectFull =
    "id,slug,title,status,language,translation_of,published_at,scheduled_for,word_count,reading_time_minutes,author,created_at,topic_id";
  const selectWithLang =
    "id,slug,title,status,language,published_at,scheduled_for,word_count,reading_time_minutes,author,created_at,topic_id";
  const selectWithoutLang =
    "id,slug,title,status,published_at,scheduled_for,word_count,reading_time_minutes,author,created_at,topic_id";

  const sb = createAdminClient();

  // 1. Fetch translation stats across all articles (independent of pagination and status filter)
  let stats = {
    totalId: 0,
    translatedEn: 0,
    untranslatedId: 0,
    percentTranslated: 0,
    totalEn: 0,
  };

  try {
    const { data: allStatsRows } = await sb
      .from("articles")
      .select("id,language,translation_of,status");

    if (allStatsRows) {
      const idRows = allStatsRows.filter(
        (r) => !r.language || r.language === "id",
      );
      const enRows = allStatsRows.filter((r) => r.language === "en");

      // Count which ID articles have at least one EN translation
      const translatedParentIds = new Set(
        enRows
          .map((r) => r.translation_of)
          .filter(Boolean) as string[],
      );

      const totalId = idRows.length;
      let translatedIdCount = 0;
      for (const idArt of idRows) {
        if (translatedParentIds.has(idArt.id)) {
          translatedIdCount++;
        }
      }

      const untranslatedId = Math.max(0, totalId - translatedIdCount);
      const percentTranslated =
        totalId > 0 ? Math.round((translatedIdCount / totalId) * 100) : 0;

      stats = {
        totalId,
        translatedEn: translatedIdCount,
        untranslatedId,
        percentTranslated,
        totalEn: enRows.length,
      };
    }
  } catch (err) {
    console.error("Failed to compute translation stats:", err);
  }

  let query = sb
    .from("articles")
    .select(selectFull, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && STATUSES.includes(status as ArticleStatus)) {
    query = query.eq("status", status);
  }

  let { data, count, error } = await query;
  let finalArticles: Record<string, unknown>[] = (data as Record<string, unknown>[]) ?? [];

  if (error && error.message.includes("translation_of")) {
    let fallback = sb
      .from("articles")
      .select(selectWithLang, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (status && STATUSES.includes(status as ArticleStatus)) {
      fallback = fallback.eq("status", status);
    }
    const res = await fallback;
    finalArticles = (res.data as Record<string, unknown>[]) ?? [];
    count = res.count;
    error = res.error;
  }

  if (error && error.message.includes("language")) {
    let fallbackQuery = sb
      .from("articles")
      .select(selectWithoutLang, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (status && STATUSES.includes(status as ArticleStatus)) {
      fallbackQuery = fallbackQuery.eq("status", status);
    }
    const retry = await fallbackQuery;
    finalArticles = ((retry.data as Record<string, unknown>[]) ?? []).map((row) => ({
      ...row,
      language: "id",
    }));
    count = retry.count;
    error = retry.error;
  }

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({
    articles: finalArticles,
    total: count ?? 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    stats,
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: {
    title?: string;
    slug?: string;
    content_md?: string;
    excerpt?: string;
    seo_title?: string;
    seo_description?: string;
    author?: string;
    status?: ArticleStatus;
    language?: string;
    translation_of?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const title = (body.title ?? "").trim();
  if (!title) return jsonError("Judul artikel wajib diisi", 400);

  const content_md = body.content_md ?? "";
  const word_count = countWords(content_md);
  const reading_time = readingTimeMinutes(word_count);

  const sb = createAdminClient();
  const baseSlug = toSlug(body.slug || title) || "artikel-baru";

  // Check unique slug
  const { data: existing } = await sb
    .from("articles")
    .select("slug")
    .ilike("slug", `${baseSlug}%`);

  const taken = new Set((existing ?? []).map((r) => r.slug));
  let slug = baseSlug;
  if (taken.has(slug)) {
    let n = 2;
    while (taken.has(withSuffix(baseSlug, n))) n++;
    slug = withSuffix(baseSlug, n);
  }

  const status: ArticleStatus = body.status && STATUSES.includes(body.status) ? body.status : "draft";
  const published_at = status === "published" ? new Date().toISOString() : null;
  const language = body.language === "en" || body.language === "id" ? body.language : "id";

  const rowToInsert: Record<string, unknown> = {
    title,
    slug,
    content_md,
    excerpt: body.excerpt || null,
    seo_title: body.seo_title || title,
    seo_description: body.seo_description || null,
    author: body.author || "Admin",
    status,
    published_at,
    word_count,
    reading_time_minutes: reading_time,
    language,
    translation_of: body.translation_of || null,
  };

  let { data: created, error } = await sb
    .from("articles")
    .insert(rowToInsert)
    .select("*")
    .single();

  // Resilient insert: automatically strip optional columns if Supabase schema cache hasn't updated yet
  let attempts = 0;
  while (error && attempts < 5) {
    attempts++;
    let stripped = false;
    for (const col of ["translation_of", "language", "category_slug", "author_id", "category_id"]) {
      if (col in rowToInsert && error.message.toLowerCase().includes(col)) {
        delete rowToInsert[col];
        stripped = true;
      }
    }
    if (!stripped) break;

    const retry = await sb.from("articles").insert(rowToInsert).select("*").single();
    created = retry.data;
    error = retry.error;
  }

  if (error) return jsonError(error.message, 500);

  if (status === "published") {
    revalidateArticles(slug);
    notifySearchEngines(slug).catch((err) => {
      console.warn("notifySearchEngines error:", (err as Error).message);
    });
  }

  return NextResponse.json({ article: created }, { status: 201 });
}
