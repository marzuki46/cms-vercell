import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export const BLOG_PER_PAGE = 10;

export const getPublishedCount = unstable_cache(
  async (locale: string = DEFAULT_LOCALE): Promise<number> => {
    const sb = createPublicClient();
    if (!sb) return 0;

    const head = () =>
      sb.from("articles").select("id", { count: "exact", head: true }).eq("status", "published");

    if (locale === DEFAULT_LOCALE || locale === "id") {
      const filtered = await head().or("language.eq.id,language.is.null");
      if (!filtered.error && (filtered.count ?? 0) > 0) return filtered.count ?? 0;
      const fallback = await head();
      return fallback.count ?? 0;
    }

    const filtered = await head().eq("language", locale);
    if (!filtered.error) return filtered.count ?? 0;
    return 0;
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

    if (locale === DEFAULT_LOCALE || locale === "id") {
      const filtered = await base().or("language.eq.id,language.is.null");
      if (!filtered.error && filtered.data && filtered.data.length > 0) {
        return filtered.data ?? [];
      }
      const fallback = await base();
      return fallback.data ?? [];
    }

    const filtered = await base().eq("language", locale);
    if (!filtered.error) return filtered.data ?? [];
    return [];
  },
  ["sitemap-articles"],
  { revalidate: 300, tags: ["articles"] },
);
