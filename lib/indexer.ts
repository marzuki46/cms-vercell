import { env } from "@/lib/env";

export const DEFAULT_INDEXNOW_KEY = "e7c8d9a1f2b34c5d6e7f8a9b0c1d2e3f";

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
}

function getBaseUrl(): string {
  const raw = env.siteUrl || "https://masboss.vercel.app";
  return raw.replace(/\/$/, "");
}

/**
 * Pings Google WebSub (PubSubHubbub) hub notifying that /rss.xml was updated.
 * Triggers Googlebot to crawl newly published articles immediately.
 */
export async function pingWebSub(): Promise<{ success: boolean; status?: number; error?: string }> {
  const base = getBaseUrl();
  const rssUrl = `${base}/rss.xml`;
  const hubUrl = "https://pubsubhubbub.appspot.com/";

  try {
    const params = new URLSearchParams();
    params.set("hub.mode", "publish");
    params.set("hub.url", rssUrl);

    const res = await fetch(hubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "MasBoss-CMS-Indexer/1.0",
      },
      body: params.toString(),
      // 10 second timeout so cron/pipeline is never held up
      signal: AbortSignal.timeout(10000),
    });

    return {
      success: res.status >= 200 && res.status < 300,
      status: res.status,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Submits published URLs directly to IndexNow (Bing, Yandex, Naver, Seznam).
 */
export async function submitIndexNow(
  urls: string[],
): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!urls || urls.length === 0) {
    return { success: true };
  }

  const base = getBaseUrl();
  let host = "masboss.vercel.app";
  try {
    host = new URL(base).hostname;
  } catch {
    // fallback
  }

  const key = getIndexNowKey();
  const keyLocation = `${base}/${key}.txt`;

  // Ensure full absolute URLs
  const fullUrls = urls.map((u) => {
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  });

  const payload = {
    host,
    key,
    keyLocation,
    urlList: fullUrls,
  };

  try {
    // Submit to central IndexNow endpoint (distributes to Bing, Yandex, etc.)
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "MasBoss-CMS-Indexer/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    return {
      success: res.status === 200 || res.status === 202,
      status: res.status,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * High-level helper: notifies both IndexNow and Google WebSub simultaneously.
 * Safe to fire-and-forget in server actions or background cron jobs.
 */
export async function notifySearchEngines(
  slugOrUrls?: string | string[],
): Promise<{
  indexNow: { success: boolean; status?: number; error?: string };
  webSub: { success: boolean; status?: number; error?: string };
}> {
  const base = getBaseUrl();
  const urls: string[] = [];

  if (typeof slugOrUrls === "string" && slugOrUrls.trim()) {
    const slug = slugOrUrls.trim();
    if (slug.startsWith("http://") || slug.startsWith("https://")) {
      urls.push(slug);
    } else {
      // Notify both language versions of the post
      urls.push(`${base}/id/blog/${slug}`);
      urls.push(`${base}/en/blog/${slug}`);
    }
  } else if (Array.isArray(slugOrUrls)) {
    for (const item of slugOrUrls) {
      if (item.startsWith("http://") || item.startsWith("https://")) {
        urls.push(item);
      } else {
        urls.push(`${base}/id/blog/${item}`);
        urls.push(`${base}/en/blog/${item}`);
      }
    }
  }

  // Always ping index/blog listing as well if URLs present
  if (urls.length > 0) {
    urls.push(`${base}/id/blog`);
    urls.push(`${base}/en/blog`);
  }

  const [indexNowRes, webSubRes] = await Promise.allSettled([
    urls.length > 0 ? submitIndexNow(urls) : Promise.resolve({ success: true }),
    pingWebSub(),
  ]);

  return {
    indexNow:
      indexNowRes.status === "fulfilled"
        ? indexNowRes.value
        : { success: false, error: (indexNowRes.reason as Error)?.message },
    webSub:
      webSubRes.status === "fulfilled"
        ? webSubRes.value
        : { success: false, error: (webSubRes.reason as Error)?.message },
  };
}
