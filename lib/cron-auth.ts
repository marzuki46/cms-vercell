import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isQStashConfigured, verifyQStash } from "@/lib/qstash";

const isDev = () => process.env.NODE_ENV !== "production";

/**
 * Authorise a cron invocation via either:
 *  - `Authorization: Bearer <CRON_SECRET>` (Vercel Cron / manual), or
 *  - a valid Upstash QStash signature header.
 *
 * In local dev, if neither secret is configured, requests are allowed for
 * convenience. In production a missing secret fails closed, so an unguarded
 * endpoint can never trigger billable AI generation.
 */
export async function authorizeCron(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  if (env.cronSecret && auth === `Bearer ${env.cronSecret}`) return true;

  const signature = request.headers.get("upstash-signature");
  if (signature) {
    const body = await request.text();
    return verifyQStash(body, signature);
  }

  if (!env.cronSecret && !isQStashConfigured() && isDev()) return true;
  return false;
}
