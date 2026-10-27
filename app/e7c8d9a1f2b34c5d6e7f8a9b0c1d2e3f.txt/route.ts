import { NextResponse } from "next/server";
import { getIndexNowKey } from "@/lib/indexer";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = getIndexNowKey();
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
