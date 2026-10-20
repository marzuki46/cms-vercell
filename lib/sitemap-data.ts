import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export const BLOG_PER_PAGE = 10;

export const getPublishedCount = unstable_cache(
  async (locale: string = DEFAULT_LOCALE): Promise<number> => {
    const sb = createPublicClient();
    if (!sb) return 0;

    // Fall back to the unfiltered count when the language column is not
    // migrated yet, so the sitemap never under-reports.
    const filtered = await sb
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("language", locale);
    if (!filtered.error) return filtered.count ?? 0;

    const { count } = await sb
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    return count ?? 0;
  },
  ["sitemap-count"],
  { revalidate: 300, tags: ["articles"] },
);

export interface SitemapArticle {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
}

export const getPublishedArticles = unstable_cache(
  async (locale?: string): Promise<SitemapArticle[]> => {
    const sb = createPublicClient();
    if (!sb) return [];

    const columns = "slug,published_at,updated_at";
    const base = () =>
      sb
        .from("articles")
        .select(columns)
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (!locale) {
      const { data, error } = await base();
      if (error) return [];
      return data ?? [];
    }

    const filtered = await base().eq("language", locale);
    if (!filtered.error) return filtered.data ?? [];

    // Column not migrated yet: fall back to all published articles.
    const { data, error } = await base();
    if (error) return [];
    return data ?? [];
  },
  ["sitemap-articles"],
  { revalidate: 300, tags: ["articles"] },
);
