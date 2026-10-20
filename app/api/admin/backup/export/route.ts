import { NextResponse } from "next/server";
import { requireAdminApi, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  try {
    const sb = createAdminClient();

    // 1. Fetch settings
    const settingsRes = await sb.from("settings").select("*");
    const settings = settingsRes.data ?? [];

    // 2. Fetch all articles
    const articlesRes = await sb
      .from("articles")
      .select("*")
      .order("created_at", { ascending: true });
    const articles = articlesRes.data ?? [];

    // 3. Fetch authors
    const authorsRes = await sb
      .from("authors")
      .select("*")
      .order("created_at", { ascending: true });
    const authors = authorsRes.data ?? [];

    // 4. Fetch categories
    const categoriesRes = await sb
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    const categories = categoriesRes.data ?? [];

    // 5. Fetch redirects
    const redirectsRes = await sb
      .from("redirects")
      .select("*")
      .order("created_at", { ascending: true });
    const redirects = redirectsRes.data ?? [];

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    const payload = {
      app: "cms-wp-lite",
      version: "1.0",
      exported_at: now.toISOString(),
      counts: {
        settings: settings.length,
        articles: articles.length,
        authors: authors.length,
        categories: categories.length,
        redirects: redirects.length,
      },
      data: {
        settings,
        articles,
        authors,
        categories,
        redirects,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const filename = `backup-cms-${dateStr}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    return jsonError(`Gagal mengekspor data: ${(err as Error).message}`, 500);
  }
}
