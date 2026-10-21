import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ redirects: [] });
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ redirects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: { from_path?: string; to_path?: string; status_code?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError("Body request harus berupa JSON valid", 400);
  }

  let fromPath = (body.from_path ?? "").trim();
  let toPath = (body.to_path ?? "").trim();
  const statusCode = Number(body.status_code) === 302 ? 302 : 301;

  if (!fromPath) return jsonError("URL asal (From path) wajib diisi", 400);
  if (!toPath) return jsonError("URL tujuan (To path) wajib diisi", 400);

  // Standardize leading slash for relative paths
  if (!fromPath.startsWith("/") && !fromPath.startsWith("http")) {
    fromPath = `/${fromPath}`;
  }
  if (!toPath.startsWith("/") && !toPath.startsWith("http")) {
    toPath = `/${toPath}`;
  }

  // Prevent direct circular redirect loop
  if (fromPath.toLowerCase() === toPath.toLowerCase()) {
    return jsonError("URL asal dan URL tujuan tidak boleh sama persis (loop)", 400);
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("redirects")
    .upsert(
      {
        from_path: fromPath,
        to_path: toPath,
        status_code: statusCode,
      },
      { onConflict: "from_path" },
    )
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true, redirect: data });
}
