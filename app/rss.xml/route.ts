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
  const articles = await getPublishedArticles(50);
  const base = env.siteUrl || "http://localhost:3000";

  const items = articles
    .map((a) => {
      const url = `${base}/blog/${a.slug}`;
      const description = escapeXml(a.excerpt ?? a.title);
      const date = a.published_at
        ? new Date(a.published_at).toUTCString()
        : new Date().toUTCString();
      const author = a.author ? `<dc:creator>${escapeXml(a.author)}</dc:creator>` : "";
      return [
        "    <item>",
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${description}</description>`,
        `      <pubDate>${date}</pubDate>`,
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
    <link>${base}</link>
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
