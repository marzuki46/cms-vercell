import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const DEFAULT_ADS_TXT = "google.com, pub-5979323216501634, DIRECT, f08c47fec0942fa0";

export async function GET() {
  let content = DEFAULT_ADS_TXT;
  try {
    const s = await getSettings();
    if (s.ads_txt && s.ads_txt.trim()) {
      content = s.ads_txt.trim();
    }
  } catch (err) {
    console.error("ads.txt route error:", err);
  }

  return new NextResponse(content + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
