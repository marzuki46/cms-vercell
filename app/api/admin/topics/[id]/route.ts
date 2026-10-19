import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TopicStatus } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: TopicStatus[] = ["idea", "approved", "used", "rejected"];

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  let body: { status?: TopicStatus };
  try {
    body = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }
  if (!body.status || !STATUSES.includes(body.status)) {
    return jsonError(`Status harus salah satu dari: ${STATUSES.join(", ")}`);
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("topics")
    .update({ status: body.status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Topik tidak ditemukan.", 404);
  return NextResponse.json({ topic: data });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  const sb = createAdminClient();
  const { error } = await sb.from("topics").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
