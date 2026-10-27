import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitIndexNow, pingWebSub, getIndexNowKey } from "@/lib/indexer";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  let body: { all?: boolean; urls?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // default body is fine
  }

  const base = (env.siteUrl || "https://masboss.vercel.app").replace(/\/$/, "");
  const sb = createAdminClient();

  // Fetch all published articles to submit in bulk
  const { data: articles, error } = await sb
    .from("articles")
    .select("slug,language")
    .eq("status", "published");

  if (error) {
    return jsonError(error.message, 500);
  }

  const urlSet = new Set<string>();

  // Add core site URLs
  urlSet.add(`${base}/id`);
  urlSet.add(`${base}/en`);
  urlSet.add(`${base}/id/blog`);
  urlSet.add(`${base}/en/blog`);

  for (const a of articles ?? []) {
    const lang = a.language === "en" ? "en" : "id";
    urlSet.add(`${base}/${lang}/blog/${a.slug}`);
  }

  // If specific URLs passed in body, include those too
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (u.startsWith("http")) urlSet.add(u);
      else urlSet.add(`${base}${u.startsWith("/") ? "" : "/"}${u}`);
    }
  }

  const allUrls = Array.from(urlSet);

  const [indexNowRes, webSubRes] = await Promise.allSettled([
    submitIndexNow(allUrls),
    pingWebSub(),
  ]);

  return NextResponse.json({
    ok: true,
    totalUrls: allUrls.length,
    indexNowKey: getIndexNowKey(),
    indexNow:
      indexNowRes.status === "fulfilled"
        ? indexNowRes.value
        : { success: false, error: (indexNowRes.reason as Error)?.message },
    webSub:
      webSubRes.status === "fulfilled"
        ? webSubRes.value
        : { success: false, error: (webSubRes.reason as Error)?.message },
  });
}
