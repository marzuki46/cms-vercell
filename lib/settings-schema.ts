import { createAdminClient } from "@/lib/supabase/admin";

/** Optional columns added after the initial schema. Missing ones are tolerated. */
export const OPTIONAL_COLUMNS = [
  "whatsapp_number",
  "whatsapp_message",
  "theme_template",
  "google_site_verification",
  "home_copy",
  "author_profile",
  "adsense_client_id",
  "ads_txt",
] as const;

export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number];

const SQL_FOR_COLUMN: Record<OptionalColumn, string> = {
  whatsapp_number:
    "alter table public.settings add column if not exists whatsapp_number text;",
  whatsapp_message:
    "alter table public.settings add column if not exists whatsapp_message text;",
  theme_template:
    "alter table public.settings add column if not exists theme_template text not null default 'modern';",
  google_site_verification:
    "alter table public.settings add column if not exists google_site_verification text;",
  home_copy:
    "alter table public.settings add column if not exists home_copy jsonb;",
  author_profile:
    "alter table public.settings add column if not exists author_profile jsonb;",
  adsense_client_id:
    "alter table public.settings add column if not exists adsense_client_id text;",
  ads_txt:
    "alter table public.settings add column if not exists ads_txt text;",
};

let cache: Record<OptionalColumn, boolean> | null = null;

const EMPTY_MAP = OPTIONAL_COLUMNS.reduce(
  (acc, col) => {
    acc[col] = false;
    return acc;
  },
  {} as Record<OptionalColumn, boolean>,
);

/**
 * Detect which optional settings columns actually exist in the database.
 * PostgREST returns PGRST204 when a selected column is absent, so we probe
 * each one once per process and cache the result.
 */
export async function availableColumns(): Promise<Record<OptionalColumn, boolean>> {
  if (cache) return cache;

  const sb = createAdminClient();
  const result = { ...EMPTY_MAP };

  for (const col of OPTIONAL_COLUMNS) {
    const { error } = await sb.from("settings").select(col).limit(1);
    result[col] = !error;
  }

  cache = result;
  return result;
}

/** Columns that are missing and must be created in the Supabase SQL editor. */
export async function missingColumns(): Promise<OptionalColumn[]> {
  const available = await availableColumns();
  return OPTIONAL_COLUMNS.filter((c) => !available[c]);
}

/** Copy-paste ready SQL that adds the given missing columns. */
export function buildRepairSql(missing: readonly OptionalColumn[]): string {
  if (missing.length === 0) {
    return "-- Semua kolom sudah lengkap. Tidak ada yang perlu diperbaiki.";
  }
  return missing.map((c) => SQL_FOR_COLUMN[c]).join("\n");
}

/** Copy-paste ready SQL that adds every currently missing column. */
export async function repairSql(): Promise<string> {
  return buildRepairSql(await missingColumns());
}
