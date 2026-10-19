import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS. SERVER ONLY.
 * Never import this into a Client Component.
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error(
      "Supabase admin credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
