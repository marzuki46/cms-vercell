import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import {
  runPublishDue,
  runBrainstorm,
  runGenerate,
  runAutoTranslate,
} from "@/lib/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

interface DailyCronReport {
  timestamp: string;
  publish?: { published: number; slugs: string[] } | { error: string };
  brainstorm?: { created: number; skipped: number } | { error?: string; skippedReason?: string };
  generate?: { title: string; slug: string; status: string } | { error: string };
  translate?: { translated: boolean; message?: string; englishTitle?: string } | { error: string };
}

async function handle(request: NextRequest) {
  if (!(await authorizeCron(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report: DailyCronReport = {
    timestamp: new Date().toISOString(),
  };

  // 1. Publish any scheduled articles whose time has arrived
  try {
    const pubRes = await runPublishDue();
    report.publish = { published: pubRes.published, slugs: pubRes.slugs };
  } catch (err) {
    report.publish = { error: (err as Error).message };
  }

  // 2. Check topic ideas inventory. If fewer than 5 ideas left, brainstorm new ideas
  try {
    const sb = createAdminClient();
    const { count } = await sb
      .from("topics")
      .select("id", { count: "exact", head: true })
      .in("status", ["idea", "approved"]);

    if ((count ?? 0) < 5) {
      const bsRes = await runBrainstorm();
      report.brainstorm = { created: bsRes.created, skipped: bsRes.skipped };
    } else {
      report.brainstorm = { skippedReason: `Stok ide masih cukup (${count} ide tersedia).` };
    }
  } catch (err) {
    report.brainstorm = { error: (err as Error).message };
  }

  // 3. Generate 1 new Indonesian article from the best topic
  let generatedArticleId: string | undefined;
  try {
    const genRes = await runGenerate();
    generatedArticleId = genRes.articleId;
    report.generate = {
      title: genRes.title,
      slug: genRes.slug,
      status: genRes.status,
    };
  } catch (err) {
    report.generate = { error: (err as Error).message };
  }

  // 4. Translate: translate the newly generated article (or next queue) into English
  try {
    const transRes = await runAutoTranslate(generatedArticleId);
    report.translate = {
      translated: transRes.translated,
      message: transRes.message,
      englishTitle: transRes.englishArticle?.title,
    };
  } catch (err) {
    report.translate = { error: (err as Error).message };
  }

  return NextResponse.json({
    ok: true,
    message: "Master Daily Pipeline completed successfully.",
    report,
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
