export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  cronSecret: process.env.CRON_SECRET ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

/** True when the public Supabase credentials are available. */
export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** True when the service-role key is available (server-side writes). */
export function hasServiceRole(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}
