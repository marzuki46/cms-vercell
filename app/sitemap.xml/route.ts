import { NextResponse } from "next/server";
import {
  getPublishedArticles,
  getPublishedCount,
  BLOG_PER_PAGE,
} from "@/lib/sitemap-data";
import { env } from "@/lib/env";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function baseUrl() {
  return env.siteUrl || "http://localhost:3000";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq?: string;
  priority?: number;
  alternates?: Record<string, string>;
}

export async function GET() {
  const base = baseUrl();
  const [articlesByLocale, totalsByLocale] = await Promise.all([
    Promise.all(SUPPORTED_LOCALES.map((locale) => getPublishedArticles(locale))),
    Promise.all(SUPPORTED_LOCALES.map((locale) => getPublishedCount(locale))),
  ]);

  const now = new Date().toISOString();
  const entries: SitemapEntry[] = [];

  // 1. Root & static pages per locale
  SUPPORTED_LOCALES.forEach((locale) => {
    const localeAlternates: Record<string, string> = {
      ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, `${base}/${l}`])),
      "x-default": `${base}/id`,
    };

    const blogAlternates: Record<string, string> = {
      ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, `${base}/${l}/blog`])),
      "x-default": `${base}/id/blog`,
    };

    const staticAlternates = (subpath: string): Record<string, string> => ({
      ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, `${base}/${l}${subpath}`])),
      "x-default": `${base}/id${subpath}`,
    });

    entries.push(
      {
        url: `${base}/${locale}`,
        lastmod: now,
        changefreq: "daily",
        priority: 1.0,
        alternates: localeAlternates,
      },
      {
        url: `${base}/${locale}/blog`,
        lastmod: now,
        changefreq: "daily",
        priority: 0.9,
        alternates: blogAlternates,
      },
      {
        url: `${base}/${locale}/about`,
        lastmod: now,
        changefreq: "monthly",
        priority: 0.5,
        alternates: staticAlternates("/about"),
      },
      {
        url: `${base}/${locale}/contact`,
        lastmod: now,
        changefreq: "monthly",
        priority: 0.5,
        alternates: staticAlternates("/contact"),
      },
      {
        url: `${base}/${locale}/author/admin`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.6,
        alternates: staticAlternates("/author/admin"),
      },
      {
        url: `${base}/${locale}/category/panduan`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.7,
        alternates: staticAlternates("/category/panduan"),
      },
      {
        url: `${base}/${locale}/category/berita-tren`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.7,
        alternates: staticAlternates("/category/berita-tren"),
      },
    );
  });

  // 2. Pagination pages
  SUPPORTED_LOCALES.forEach((locale, index) => {
    const total = totalsByLocale[index] ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / BLOG_PER_PAGE));
    for (let i = 2; i <= totalPages; i++) {
      entries.push({
        url: `${base}/${locale}/blog/page/${i}`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.5,
      });
    }
  });

  // 3. Articles grouped by translation pairing for hreflang
  const idArticles = articlesByLocale[0] ?? [];
  const enArticles = articlesByLocale[1] ?? [];

  for (const locale of SUPPORTED_LOCALES) {
    const isEn = locale === "en";
    const currentList = isEn ? enArticles : idArticles;
    const partnerList = isEn ? idArticles : enArticles;

    for (const article of currentList) {
      // Find translated partner
      const partner = partnerList.find((p) => {
        if (isEn) {
          return (
            (article.translation_of && p.id === article.translation_of) ||
            p.slug === article.slug
          );
        } else {
          return (
            (p.translation_of && p.translation_of === article.id) ||
            p.slug === article.slug
          );
        }
      });

      const languages: Record<string, string> = {
        [locale]: `${base}/${locale}/blog/${article.slug}`,
      };

      if (partner) {
        const partnerLocale = isEn ? "id" : "en";
        languages[partnerLocale] = `${base}/${partnerLocale}/blog/${partner.slug}`;
        languages["x-default"] = `${base}/id/blog/${isEn ? partner.slug : article.slug}`;
      } else {
        // If single language without translation, x-default points to its own URL (no 404 leakage)
        languages["x-default"] = `${base}/${locale}/blog/${article.slug}`;
      }

      entries.push({
        url: `${base}/${locale}/blog/${article.slug}`,
        lastmod: article.updated_at
          ? new Date(article.updated_at).toISOString()
          : now,
        changefreq: "weekly",
        priority: 0.7,
        alternates: languages,
      });
    }
  }

  // XML Builder with XSL stylesheet
  const urlNodes = entries.map((entry) => {
    const lines = [
      "  <url>",
      `    <loc>${escapeXml(entry.url)}</loc>`,
      `    <lastmod>${entry.lastmod}</lastmod>`,
    ];
    if (entry.changefreq) {
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (entry.priority !== undefined) {
      lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }
    if (entry.alternates) {
      for (const [lang, href] of Object.entries(entry.alternates)) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}" />`,
        );
      }
    }
    lines.push("  </url>");
    return lines.join("\n");
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlNodes.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
