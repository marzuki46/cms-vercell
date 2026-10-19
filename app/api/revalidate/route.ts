import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { revalidateArticles, revalidatePagination, revalidateSettings } from "@/lib/revalidate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * On-demand revalidation used by admin edits and cron jobs.
 * Auth: Bearer <CRON_SECRET>, a valid QStash signature, or open in local dev.
 */
export async function POST(request: NextRequest) {
  if (!(await authorizeCron(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let slug: string | undefined;
  let totalPages: number | undefined;
  try {
    const body = await request.json();
    if (typeof body?.slug === "string" && body.slug.startsWith("/") === false) {
      slug = body.slug;
    }
    if (Number.isFinite(body?.totalPages)) {
      totalPages = Number(body.totalPages);
    }
  } catch {
    // no body is fine — everything public is revalidated
  }

  revalidateArticles(slug);
  revalidateSettings();
  if (totalPages) revalidatePagination(totalPages);

  return NextResponse.json({ ok: true, slug: slug ?? null });
}
