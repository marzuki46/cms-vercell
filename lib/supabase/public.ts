import { createClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "@/lib/env";

/**
 * Anonymous Supabase client for public reads (respects RLS).
 * Returns null when credentials are not configured (e.g. during a build
 * without secrets), so callers can degrade gracefully.
 */
export function createPublicClient() {
  if (!hasSupabase()) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
