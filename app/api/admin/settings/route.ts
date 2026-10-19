import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Settings } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const s = await getSettings();
  const key = s.ninerouter_key;
  const masked: Settings = { ...s, ninerouter_key: "" };
  return NextResponse.json({
    settings: masked,
    defaults: DEFAULT_SETTINGS,
    hasKey: Boolean(key),
    keyPreview: key ? `••••${key.slice(-4)}` : null,
  });
}

export async function PUT(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let patch: Partial<Settings>;
  try {
    patch = await request.json();
  } catch {
    return jsonError("Body tidak valid.");
  }

  // Never allow the client to null out the key by sending an empty string;
  // empty means "keep the existing secret".
  if (patch.ninerouter_key === "" || patch.ninerouter_key === null) {
    delete patch.ninerouter_key;
  }
  delete patch.id;
  delete patch.updated_at;

  try {
    const saved = await saveSettings(patch);
    const key = saved.ninerouter_key;
    return NextResponse.json({
      settings: { ...saved, ninerouter_key: "" },
      hasKey: Boolean(key),
      keyPreview: key ? `••••${key.slice(-4)}` : null,
    });
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
}
