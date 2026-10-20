import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSlug, withSuffix } from "@/lib/slug";
import { countWords, readingTimeMinutes } from "@/lib/text";
import { revalidateArticles } from "@/lib/revalidate";
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
  const limit = Math.min(Number(sp.get("limit")) || 50, 200);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);

  const sb = createAdminClient();
  let query = sb
    .from("articles")
    .select(
      "id,slug,title,status,language,published_at,scheduled_for,word_count,reading_time_minutes,author,created_at,topic_id",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && STATUSES.includes(status as ArticleStatus)) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ articles: data ?? [], total: count ?? 0 });
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
  };

  let { data: created, error } = await sb
    .from("articles")
    .insert(rowToInsert)
    .select("*")
    .single();

  // Tolerance fallback: if database has not executed migration 0004 yet (language column missing)
  if (error && error.message.includes("column") && error.message.includes("language")) {
    delete rowToInsert.language;
    const retry = await sb.from("articles").insert(rowToInsert).select("*").single();
    created = retry.data;
    error = retry.error;
  }

  if (error) return jsonError(error.message, 500);

  if (status === "published") revalidateArticles(slug);

  return NextResponse.json({ article: created }, { status: 201 });
}
