import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export interface AdminUser {
  id: string;
  email: string;
}

/** Return the logged-in user, or null. */
export async function getSessionUser(): Promise<AdminUser | null> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return null;
  return { id: user.id, email: user.email };
}

/** True when the email is in the ADMIN_EMAILS allowlist (or no allowlist is set). */
export function isAdminEmail(email: string): boolean {
  if (env.adminEmails.length === 0) return true;
  return env.adminEmails.includes(email.toLowerCase());
}

/** Return the user only if they are an allowed admin. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getSessionUser();
  if (!user) {
    if (process.env.NODE_ENV !== "production" && (!env.supabaseUrl || !env.supabaseAnonKey)) {
      return { id: "dev-admin", email: "admin@local.test" };
    }
    return null;
  }
  if (!isAdminEmail(user.email)) return null;
  return user;
}
