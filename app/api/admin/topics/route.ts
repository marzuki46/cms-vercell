import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TopicStatus } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: TopicStatus[] = ["idea", "approved", "used", "rejected"];

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const limit = Math.min(Number(sp.get("limit")) || 50, 200);

  const sb = createAdminClient();
  let query = sb
    .from("topics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status && STATUSES.includes(status as TopicStatus)) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ topics: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: { title?: string; primary_keyword?: string; angle?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }
  if (!body.title?.trim()) return jsonError("Judul wajib diisi.");

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("topics")
    .insert({
      title: body.title.trim(),
      primary_keyword: body.primary_keyword?.trim() || null,
      angle: body.angle?.trim() || null,
      status: "approved",
      source: "manual",
    })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ topic: data }, { status: 201 });
}
