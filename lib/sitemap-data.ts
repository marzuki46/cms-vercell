import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export const BLOG_PER_PAGE = 10;

export const getPublishedCount = unstable_cache(
  async (): Promise<number> => {
    const sb = createPublicClient();
    if (!sb) return 0;
    const { count, error } = await sb
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    if (error) return 0;
    return count ?? 0;
  },
  ["sitemap-count"],
  { revalidate: 300, tags: ["articles"] },
);

/** Every published slug + timestamps, used to expand the sitemap. */
export const getPublishedArticles = unstable_cache(
  async (): Promise<{ slug: string; published_at: string | null; updated_at: string | null }[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("articles")
      .select("slug,published_at,updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) return [];
    return data ?? [];
  },
  ["sitemap-articles"],
  { revalidate: 300, tags: ["articles"] },
);
