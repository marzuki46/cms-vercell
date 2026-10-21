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

function isSafeUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    // Block internal loopback and private clouds (SSRF defense)
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host === "169.254.169.254" // AWS/GCP metadata service
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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

  if (!isSafeUrl(url)) {
    return jsonError("Endpoint URL tidak diizinkan demi keamanan (SSRF protection).", 400);
  }

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
