import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { listModels, chat } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface TestBody {
  url?: string;
  key?: string;
  model?: string;
  deep?: boolean;
}

/** Test a 9Router endpoint: list models, optionally run a tiny completion. */
export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: TestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }

  const url = (body.url ?? "").trim();
  const key = (body.key ?? "").trim();
  const model = (body.model ?? "").trim();
  if (!url) return jsonError("Endpoint wajib diisi.");

  try {
    const cfg = { url, key };
    const models = await listModels(cfg);
    let reply: string | null = null;
    if (body.deep && model) {
      const res = await chat(cfg, {
        model,
        user: "Balas dengan satu kata: OK",
        temperature: 0,
      });
      reply = res.text.slice(0, 120);
    }
    return NextResponse.json({
      ok: true,
      count: models.length,
      models: models.slice(0, 60),
      reply,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    );
  }
}
