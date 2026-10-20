import { getPublishedArticles, getSiteSettings } from "@/lib/content";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const site = await getSiteSettings();
  const base = env.siteUrl || "http://localhost:3000";

  const [idArticles, enArticles] = await Promise.all([
    getPublishedArticles(50, 0, "id"),
    getPublishedArticles(50, 0, "en"),
  ]);

  const seen = new Set<string>();
  const items = [...idArticles, ...enArticles]
    .filter((a) => {
      const key = `${a.slug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => {
      const language = idArticles.includes(a) ? "id" : "en";
      const url = `${base}/${language}/blog/${a.slug}`;
      const description = escapeXml(a.excerpt ?? a.title);
      const date = a.published_at
        ? new Date(a.published_at).toUTCString()
        : new Date().toUTCString();
      const author = a.author
        ? `      <dc:creator>${escapeXml(a.author)}</dc:creator>`
        : "";

      return [
        "    <item>",
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${description}</description>`,
        `      <pubDate>${date}</pubDate>`,
        `      <category>${language}</category>`,
        author,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(site.site_name)}</title>
    <link>${base}/id</link>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(site.site_name)} — artikel dan panduan terbaru.</description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
