import { NextResponse } from "next/server";
import { getSessionUser, isAdminEmail, type AdminUser } from "@/lib/auth";

type GuardResult =
  | { user: AdminUser; response: null }
  | { user: null; response: NextResponse };

/** Guard an admin route handler. Returns a 401 response when unauthorised. */
export async function requireAdminApi(): Promise<GuardResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Sesi login tidak ditemukan. Silakan login kembali di /admin/login." },
        { status: 401 },
      ),
    };
  }

  if (!isAdminEmail(sessionUser.email)) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: `Email '${sessionUser.email}' tidak terdaftar di variabel ADMIN_EMAILS. Tambahkan email ini di Environment Variables Vercel.`,
        },
        { status: 403 },
      ),
    };
  }

  return { user: sessionUser, response: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
