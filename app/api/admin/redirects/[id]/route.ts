import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await params;
  if (!id) return jsonError("ID redirect wajib disertakan", 400);

  const sb = createAdminClient();
  const { error } = await sb.from("redirects").delete().eq("id", id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true, deletedId: id });
}
