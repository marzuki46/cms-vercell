import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { revalidateSettings } from "@/lib/revalidate";
import { getSettings, saveSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { missingColumns, repairSql } from "@/lib/settings-schema";
import type { Settings } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const s = await getSettings();
  const key = s.ninerouter_key;
  const masked: Settings = { ...s, ninerouter_key: "" };

  let missing: string[] = [];
  let repair = "";
  try {
    missing = await missingColumns();
    repair = await repairSql();
  } catch {
    // database unavailable; settings still returned with defaults
  }

  return NextResponse.json({
    settings: masked,
    defaults: DEFAULT_SETTINGS,
    hasKey: Boolean(key),
    keyPreview: key ? `••••${key.slice(-4)}` : null,
    missingColumns: missing,
    repairSql: repair,
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

  // SSRF defense: check ninerouter_url if updated
  if (patch.ninerouter_url) {
    try {
      const u = new URL(patch.ninerouter_url);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return jsonError("URL 9Router harus berupa http:// atau https://", 400);
      }
      const h = u.hostname.toLowerCase();
      if (
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "0.0.0.0" ||
        h === "::1" ||
        h.endsWith(".local") ||
        h.endsWith(".internal") ||
        h.startsWith("10.") ||
        h.startsWith("192.168.") ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
        h === "169.254.169.254"
      ) {
        return jsonError("URL 9Router tidak boleh mengarah ke network internal (SSRF protection).", 400);
      }
    } catch {
      return jsonError("Format URL 9Router tidak valid.", 400);
    }
  }

  try {
    const saved = await saveSettings(patch);

    // Flush the tagged data cache + every public route so the new site name,
    // language and template appear immediately instead of after the ISR window.
    revalidateSettings();

    const key = saved.ninerouter_key;
    return NextResponse.json({
      settings: { ...saved, ninerouter_key: "" },
      hasKey: Boolean(key),
      keyPreview: key ? `••••${key.slice(-4)}` : null,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (/column|schema cache|PGRST/i.test(message)) {
      return jsonError(
        `${message} — Jalankan SQL perbaikan dari tab Pengaturan Situs di admin.`,
        409,
      );
    }
    return jsonError(message, 500);
  }
}
