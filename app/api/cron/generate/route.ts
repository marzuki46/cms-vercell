import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runGenerate } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function handle(request: NextRequest) {
  if (!(await authorizeCron(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await runGenerate();
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
