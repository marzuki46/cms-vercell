import type { MetadataRoute } from "next";
import {
  getPublishedArticles,
  getPublishedCount,
  BLOG_PER_PAGE,
} from "@/lib/sitemap-data";
import { env } from "@/lib/env";

export const revalidate = 3600;

function baseUrl() {
  return env.siteUrl || "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const [total, articles] = await Promise.all([
    getPublishedCount(),
    getPublishedArticles(),
  ]);

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  const totalPages = Math.max(1, Math.ceil(total / BLOG_PER_PAGE));
  for (let i = 2; i <= totalPages; i++) {
    entries.push({
      url: `${base}/blog/page/${i}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  for (const a of articles) {
    entries.push({
      url: `${base}/blog/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
