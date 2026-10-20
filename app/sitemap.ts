import type { MetadataRoute } from "next";
import {
  getPublishedArticles,
  getPublishedCount,
  BLOG_PER_PAGE,
} from "@/lib/sitemap-data";
import { env } from "@/lib/env";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

export const revalidate = 3600;

function baseUrl() {
  return env.siteUrl || "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const [articlesByLocale, totalsByLocale] = await Promise.all([
    Promise.all(
      SUPPORTED_LOCALES.map((locale) => getPublishedArticles(locale)),
    ),
    Promise.all(
      SUPPORTED_LOCALES.map((locale) => getPublishedCount(locale)),
    ),
  ]);

  const now = new Date();

  // Root + top-level pages for each locale, with hreflang alternates.
  const entries: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) => [
    {
      url: `${base}/${locale}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: {
          ...Object.fromEntries(
            SUPPORTED_LOCALES.map((l) => [l, `${base}/${l}`]),
          ),
          "x-default": `${base}/id`,
        },
      },
    },
    {
      url: `${base}/${locale}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          ...Object.fromEntries(
            SUPPORTED_LOCALES.map((l) => [l, `${base}/${l}/blog`]),
          ),
          "x-default": `${base}/id/blog`,
        },
      },
    },
    {
      url: `${base}/${locale}/about`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/${locale}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/${locale}/author/admin`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ]);

  // Pagination.
  SUPPORTED_LOCALES.forEach((locale, index) => {
    const total = totalsByLocale[index] ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / BLOG_PER_PAGE));
    for (let i = 2; i <= totalPages; i++) {
      entries.push({
        url: `${base}/${locale}/blog/page/${i}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  });

  // Articles, grouped so a slug published in both languages gets hreflang links.
  const bySlug = new Map<
    string,
    Partial<Record<(typeof SUPPORTED_LOCALES)[number], (typeof articlesByLocale)[number][number]>>
  >();

  SUPPORTED_LOCALES.forEach((locale, index) => {
    for (const article of articlesByLocale[index] ?? []) {
      const current = bySlug.get(article.slug) ?? {};
      current[locale] = article;
      bySlug.set(article.slug, current);
    }
  });

  for (const [slug, variants] of bySlug) {
    const primary = variants.id ?? variants.en;
    if (!primary) continue;

    const languages: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
      if (variants[locale]) {
        languages[locale] = `${base}/${locale}/blog/${slug}`;
      }
    }
    languages["x-default"] = `${base}/id/blog/${slug}`;

    SUPPORTED_LOCALES.forEach((locale) => {
      const variant = variants[locale];
      if (!variant) return;
      entries.push({
        url: `${base}/${locale}/blog/${slug}`,
        lastModified: variant.updated_at ? new Date(variant.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages },
      });
    });
  }

  return entries;
}
