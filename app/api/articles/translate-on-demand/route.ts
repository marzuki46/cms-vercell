import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutoTranslate } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  let body: { articleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { articleId } = body;
  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const sb = createAdminClient();

  // 1. Check if already translated (race condition safety)
  try {
    const { data: existing } = await sb
      .from("articles")
      .select("id,slug,title,content_md,status")
      .eq("translation_of", articleId)
      .eq("language", "en")
      .maybeSingle();

    if (existing && existing.content_md) {
      return NextResponse.json({
        ok: true,
        alreadyTranslated: true,
        englishArticle: existing,
      });
    }

    // 2. Run translation pipeline for this article
    const res = await runAutoTranslate(articleId);

    if (!res.translated || !res.englishArticle) {
      return NextResponse.json(
        { ok: false, error: res.message || "Failed to translate article" },
        { status: 500 },
      );
    }

    // 3. Fetch newly inserted full content
    const { data: fullEn } = await sb
      .from("articles")
      .select("id,slug,title,content_md,status,excerpt")
      .eq("id", res.englishArticle.id)
      .single();

    return NextResponse.json({
      ok: true,
      alreadyTranslated: false,
      englishArticle: fullEn || res.englishArticle,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
