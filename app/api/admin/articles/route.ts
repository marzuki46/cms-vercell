import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
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
      "id,slug,title,status,published_at,scheduled_for,word_count,reading_time_minutes,author,created_at,topic_id",
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
