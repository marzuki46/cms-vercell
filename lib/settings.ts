import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import type { Settings } from "@/types/db";

export const DEFAULT_SETTINGS: Omit<Settings, "id" | "updated_at"> = {
  site_name: "Portal Konten SEO",
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
};

/** Load the singleton settings row, creating it if missing. */
export async function getSettings(): Promise<Settings> {
  if (!hasServiceRole()) {
    return {
      id: "unconfigured",
      updated_at: new Date().toISOString(),
      ...DEFAULT_SETTINGS,
    };
  }
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data as Settings;

  const { data: created, error: insertError } = await sb
    .from("settings")
    .insert({ singleton: true })
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);
  return created as Settings;
}

/** Patch the singleton settings row. */
export async function saveSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings();
  const sb = createAdminClient();
  const { id, updated_at, ...rest } = { ...current, ...patch };
  void id;
  void updated_at;
  const { data, error } = await sb
    .from("settings")
    .update(rest)
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}
