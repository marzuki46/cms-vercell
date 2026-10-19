import { NextResponse } from "next/server";
import { getAdminUser, type AdminUser } from "@/lib/auth";

type GuardResult =
  | { user: AdminUser; response: null }
  | { user: null; response: NextResponse };

/** Guard an admin route handler. Returns a 401 response when unauthorised. */
export async function requireAdminApi(): Promise<GuardResult> {
  const user = await getAdminUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, response: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
