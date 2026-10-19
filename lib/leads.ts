import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import type { LeadStatus, WhatsAppLead } from "@/types/db";

export interface NewLead {
  visitor_phone: string;
  visitor_name?: string | null;
  visitor_message?: string | null;
  page_path?: string | null;
  article_slug?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
}

/**
 * Persist a lead. Returns the new id, or null when the service-role key is
 * missing (local dev without env) — callers should treat that as "not recorded"
 * rather than an error, so the visitor flow keeps working.
 */
export async function recordLead(input: NewLead): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("whatsapp_leads")
    .insert({
      visitor_phone: input.visitor_phone,
      visitor_name: input.visitor_name || null,
      visitor_message: input.visitor_message || null,
      page_path: input.page_path || null,
      article_slug: input.article_slug || null,
      referrer: input.referrer || null,
      user_agent: input.user_agent || null,
      status: "new",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function listLeads(
  status?: LeadStatus,
  limit = 100,
): Promise<WhatsAppLead[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  let query = sb
    .from("whatsapp_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 200));
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppLead[];
}

export async function updateLead(
  id: string,
  patch: { status?: LeadStatus; note?: string | null },
): Promise<WhatsAppLead | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("whatsapp_leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WhatsAppLead) ?? null;
}

export async function deleteLead(id: string): Promise<void> {
  if (!hasServiceRole()) return;
  const sb = createAdminClient();
  const { error } = await sb.from("whatsapp_leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
