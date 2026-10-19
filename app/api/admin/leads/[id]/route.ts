import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { updateLead, deleteLead } from "@/lib/leads";
import type { LeadStatus } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: LeadStatus[] = ["new", "contacted", "closed"];

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  let body: { status?: LeadStatus; note?: string | null };
  try {
    body = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }

  const patch: { status?: LeadStatus; note?: string | null } = {};
  if (body.status) {
    if (!STATUSES.includes(body.status)) {
      return jsonError(`Status harus salah satu dari: ${STATUSES.join(", ")}`);
    }
    patch.status = body.status;
  }
  if (typeof body.note === "string") patch.note = body.note;
  if (!Object.keys(patch).length) return jsonError("Tidak ada perubahan.");

  try {
    const lead = await updateLead(id, patch);
    if (!lead) return jsonError("Lead tidak ditemukan.", 404);
    return NextResponse.json({ lead });
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await deleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
}
