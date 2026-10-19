import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordLead } from "@/lib/leads";
import { normalizeWaNumber } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LeadSchema = z.object({
  phone: z.string().min(6).max(32),
  name: z.string().max(80).optional().default(""),
  message: z.string().max(500).optional().default(""),
  path: z.string().max(300).optional().default(""),
  slug: z.string().max(300).optional().default(""),
  referrer: z.string().max(500).optional().default(""),
});

/** Naive per-IP throttle (per serverless instance). */
const BUCKET_TTL = 10 * 60 * 1000;
const MAX_PER_BUCKET = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function allow(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + BUCKET_TTL });
    return true;
  }
  bucket.count += 1;
  if (buckets.size > 500) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }
  return bucket.count <= MAX_PER_BUCKET;
}

export async function POST(request: NextRequest) {
  if (!allow(clientIp(request))) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Nomor WhatsApp tidak valid." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const digits = normalizeWaNumber(input.phone);
  if (digits.length < 8 || digits.length > 15) {
    return NextResponse.json(
      { ok: false, error: "Nomor WhatsApp tidak valid." },
      { status: 400 },
    );
  }

  try {
    const id = await recordLead({
      visitor_phone: digits,
      visitor_name: input.name || null,
      visitor_message: input.message || null,
      page_path: input.path || null,
      article_slug: input.slug || null,
      referrer: input.referrer || null,
      user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    });
    return NextResponse.json({ ok: true, recorded: Boolean(id), id });
  } catch (err) {
    console.error("recordLead failed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: "Gagal menyimpan data." }, { status: 500 });
  }
}
