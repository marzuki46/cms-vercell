import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { runBrainstorm, runGenerate } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manual content generation from the admin UI.
 * body: { action: "brainstorm" | "generate", topicId?: string, count?: number }
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: { action?: string; topicId?: string; count?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }

  try {
    if (body.action === "brainstorm") {
      const res = await runBrainstorm(body.count);
      return NextResponse.json({ action: "brainstorm", ...res });
    }
    if (body.action === "generate") {
      const res = await runGenerate(body.topicId);
      return NextResponse.json({ action: "generate", ...res });
    }
    return jsonError('action harus "brainstorm" atau "generate"');
  } catch (err) {
    return NextResponse.json(
      { action: body.action, error: (err as Error).message },
      { status: 400 },
    );
  }
}
