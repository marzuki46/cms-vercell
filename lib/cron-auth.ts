import type { NextRequest } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { isQStashConfigured, verifyQStash } from "@/lib/qstash";

const isDev = () => process.env.NODE_ENV !== "production";

/** Constant-time string comparison to prevent timing attacks */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

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
  const expected = env.cronSecret ? `Bearer ${env.cronSecret}` : "";

  if (expected && safeEqual(auth, expected)) return true;

  const signature = request.headers.get("upstash-signature");
  if (signature) {
    const body = await request.text();
    return verifyQStash(body, signature);
  }

  if (!env.cronSecret && !isQStashConfigured() && isDev()) return true;
  return false;
}
