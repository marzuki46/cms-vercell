import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * On-demand revalidation used by admin edits.
 * Auth: Bearer <CRON_SECRET>, a valid QStash signature, or open in local dev.
 */
export async function POST(request: NextRequest) {
  if (!(await authorizeCron(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let paths: string[] = ["/", "/blog"];
  try {
    const body = await request.json();
    if (Array.isArray(body?.paths)) {
      paths = body.paths.filter(
        (p: unknown): p is string => typeof p === "string" && p.startsWith("/"),
      );
    }
  } catch {
    // no body is fine — default paths are revalidated
  }

  for (const p of paths) revalidatePath(p);
  revalidatePath("/sitemap.xml");
  revalidatePath("/rss.xml");

  return NextResponse.json({ ok: true, revalidated: paths });
}
