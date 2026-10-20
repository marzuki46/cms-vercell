import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateArticles } from "@/lib/revalidate";
import { countWords, readingTimeMinutes } from "@/lib/text";
import type { ArticleStatus } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: ArticleStatus[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Artikel tidak ditemukan.", 404);
  return NextResponse.json({ article: data });
}

interface PatchBody {
  status?: ArticleStatus;
  scheduled_for?: string | null;
  title?: string;
  excerpt?: string;
  content_md?: string;
  seo_title?: string;
  seo_description?: string;
  author?: string;
  language?: string;
  translation_of?: string | null;
}

function revalidateArticle(slug: string) {
  revalidateArticles(slug);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }

  const sb = createAdminClient();
  const { data: current } = await sb
    .from("articles")
    .select("id,slug,status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return jsonError("Artikel tidak ditemukan.", 404);

  const patch: Record<string, unknown> = {};
  if (body.status) {
    if (!STATUSES.includes(body.status)) {
      return jsonError(`Status harus salah satu dari: ${STATUSES.join(", ")}`);
    }
    patch.status = body.status;
    if (body.status === "published") {
      patch.published_at = new Date().toISOString();
    }
    if (body.status === "draft" || body.status === "archived") {
      patch.published_at = null;
    }
  }
  if (body.scheduled_for !== undefined) patch.scheduled_for = body.scheduled_for;
  if (body.language === "en" || body.language === "id") patch.language = body.language;
  if (body.translation_of !== undefined) patch.translation_of = body.translation_of;
  if (typeof body.title === "string" && body.title.trim())
    patch.title = body.title.trim();
  if (typeof body.excerpt === "string") patch.excerpt = body.excerpt;
  if (typeof body.seo_title === "string") patch.seo_title = body.seo_title;
  if (typeof body.seo_description === "string")
    patch.seo_description = body.seo_description;
  if (typeof body.author === "string") patch.author = body.author;
  if (typeof body.content_md === "string") {
    patch.content_md = body.content_md;
    const words = countWords(body.content_md);
    patch.word_count = words;
    patch.reading_time_minutes = readingTimeMinutes(words);
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ article: current });
  }

  let { data, error } = await sb
    .from("articles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  // Resilient update: automatically strip optional columns if Supabase schema cache hasn't updated yet
  let attempts = 0;
  while (error && attempts < 5) {
    attempts++;
    let stripped = false;
    for (const col of ["translation_of", "language", "category_slug", "author_id", "category_id"]) {
      if (col in patch && error.message.toLowerCase().includes(col)) {
        delete patch[col];
        stripped = true;
      }
    }
    if (!stripped) break;

    const retry = await sb
      .from("articles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return jsonError(error.message, 500);

  if (data.status === "published") {
    revalidateArticle(data.slug);
  }

  return NextResponse.json({ article: data });
}
