import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { availableColumns, type OptionalColumn } from "@/lib/settings-schema";
import type { Settings } from "@/types/db";

export const DEFAULT_SETTINGS: Omit<Settings, "id" | "updated_at"> = {
  site_name: "Mas Boss",
  site_url: null,
  language: "id",
  theme_template: "modern",
  google_site_verification: null,
  ninerouter_url: null,
  ninerouter_key: null,
  model_writer: "openai/gpt-4o",
  model_planner: "openai/gpt-4o",
  embedding_model: null,
  brand_voice: null,
  niche: null,
  audience: null,
  posts_per_run: 3,
  auto_publish: false,
  default_author: "Admin",
  whatsapp_number: null,
  whatsapp_message: null,
  home_copy: null,
  author_profile: null,
};

function localSettings(): Settings {
  return {
    id: "unconfigured",
    updated_at: new Date().toISOString(),
    ...DEFAULT_SETTINGS,
  };
}

/** Merge a DB row with defaults so absent columns still return a usable shape. */
function withDefaults(
  row: Record<string, unknown>,
  present: Record<OptionalColumn, boolean>,
): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...(row as Partial<Settings>),
    id: (row.id as string) ?? "unconfigured",
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
  if (!present.theme_template) merged.theme_template = "modern";
  if (!present.google_site_verification) merged.google_site_verification = null;
  if (!present.whatsapp_number) merged.whatsapp_number = null;
  if (!present.whatsapp_message) merged.whatsapp_message = null;
  if (present.home_copy && row.home_copy) {
    merged.home_copy = row.home_copy as any;
  } else if (
    row.brand_voice &&
    typeof row.brand_voice === "string" &&
    row.brand_voice.startsWith("__HOME_COPY__:")
  ) {
    try {
      merged.home_copy = JSON.parse(row.brand_voice.slice(14));
    } catch {
      merged.home_copy = null;
    }
  }

  if (present.author_profile && row.author_profile) {
    merged.author_profile = row.author_profile as any;
  } else if (
    row.audience &&
    typeof row.audience === "string" &&
    row.audience.startsWith("__AUTHOR_PROFILE__:")
  ) {
    try {
      merged.author_profile = JSON.parse(row.audience.slice(19));
    } catch {
      merged.author_profile = null;
    }
  }

  merged.ninerouter_key = (row.ninerouter_key as string | null) ?? null;
  return merged;
}

/** Load the singleton settings row, creating it if missing. */
export async function getSettings(): Promise<Settings> {
  if (!hasServiceRole()) return localSettings();

  try {
    const sb = createAdminClient();
    let present: Record<OptionalColumn, boolean>;
    try {
      present = await availableColumns();
    } catch {
      present = {
        whatsapp_number: false,
        whatsapp_message: false,
        theme_template: false,
        google_site_verification: false,
        home_copy: false,
        author_profile: false,
      };
    }

    const columns = [
      "id",
      "site_name",
      "site_url",
      "language",
      "ninerouter_url",
      "ninerouter_key",
      "model_writer",
      "model_planner",
      "embedding_model",
      "brand_voice",
      "niche",
      "audience",
      "posts_per_run",
      "auto_publish",
      "default_author",
      "created_at",
      "updated_at",
      ...Object.entries(present)
        .filter(([, ok]) => ok)
        .map(([name]) => name),
    ].join(",");

    const { data, error } = await sb
      .from("settings")
      .select(columns)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getSettings query error:", error.message);
      return withDefaults({}, present);
    }
    if (data) return withDefaults(data as unknown as Record<string, unknown>, present);

    const { data: created } = await sb
      .from("settings")
      .insert({ singleton: true })
      .select(columns)
      .single();
    return withDefaults((created ?? {}) as unknown as Record<string, unknown>, present);
  } catch (err) {
    console.error("getSettings catch:", (err as Error).message);
    return localSettings();
  }
}

/** Patch the singleton settings row, skipping columns the database lacks. */
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const sb = createAdminClient();
  const present = await availableColumns();

  const { id, updated_at, created_at, ...rest } = { ...current, ...patch } as Record<string, unknown>;
  void id;
  void updated_at;
  void created_at;

  if (!present.home_copy && rest.home_copy) {
    rest.brand_voice = `__HOME_COPY__:${JSON.stringify(rest.home_copy)}`;
    delete rest.home_copy;
  }

  if (!present.author_profile && rest.author_profile) {
    rest.audience = `__AUTHOR_PROFILE__:${JSON.stringify(rest.author_profile)}`;
    delete rest.author_profile;
  }

  for (const [name, ok] of Object.entries(present)) {
    if (!ok) delete rest[name];
  }

  const { data, error } = await sb
    .from("settings")
    .update(rest)
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return withDefaults(data as unknown as Record<string, unknown>, present);
}
