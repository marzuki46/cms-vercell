import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { DEFAULT_LOCALE } from "@/lib/i18n";

function getContentClient() {
  if (hasServiceRole()) return createAdminClient();
  return createPublicClient();
}

export const BLOG_PER_PAGE = 10;

export const getPublishedCount = unstable_cache(
  async (locale: string = DEFAULT_LOCALE): Promise<number> => {
    const sb = getContentClient();
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
  id?: string;
  slug: string;
  translation_of?: string | null;
  published_at: string | null;
  updated_at: string | null;
}

export const getPublishedArticles = unstable_cache(
  async (locale?: string): Promise<SitemapArticle[]> => {
    const sb = getContentClient();
    if (!sb) return [];

    const columns = "id,slug,translation_of,published_at,updated_at";
    const base = () =>
      sb
        .from("articles")
        .select(columns)
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (!locale) {
      const { data, error } = await base();
      if (error) {
        const fallback = await sb
          .from("articles")
          .select("id,slug,published_at,updated_at")
          .eq("status", "published")
          .order("published_at", { ascending: false });
        return (fallback.data as SitemapArticle[]) ?? [];
      }
      return (data as SitemapArticle[]) ?? [];
    }

    if (locale === DEFAULT_LOCALE || locale === "id") {
      let res = await base().or("language.eq.id,language.is.null");
      if (res.error && res.error.message.includes("translation_of")) {
        const fallback = await sb
          .from("articles")
          .select("id,slug,published_at,updated_at")
          .eq("status", "published")
          .or("language.eq.id,language.is.null")
          .order("published_at", { ascending: false });
        return (fallback.data as unknown as SitemapArticle[]) ?? [];
      }
      if (!res.error && res.data && res.data.length > 0) {
        return (res.data as unknown as SitemapArticle[]) ?? [];
      }
      const fallback = await sb
        .from("articles")
        .select("id,slug,published_at,updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      return (fallback.data as unknown as SitemapArticle[]) ?? [];
    }

    let res = await base().eq("language", locale);
    if (res.error && res.error.message.includes("translation_of")) {
      const fallback = await sb
        .from("articles")
        .select("id,slug,published_at,updated_at")
        .eq("status", "published")
        .eq("language", locale)
        .order("published_at", { ascending: false });
      return (fallback.data as unknown as SitemapArticle[]) ?? [];
    }
    if (!res.error) return (res.data as unknown as SitemapArticle[]) ?? [];
    return [];
  },
  ["sitemap-articles"],
  { revalidate: 300, tags: ["articles"] },
);
