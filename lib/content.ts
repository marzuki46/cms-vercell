import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import type { Article, ArticleListItem } from "@/types/db";

const LIST_COLUMNS =
  "slug,title,excerpt,published_at,cover_image_url,reading_time_minutes,keywords,author";

export interface SiteSettings {
  site_name: string;
  site_url: string | null;
  language: string;
}

const isBuildTime = () => process.env.NEXT_PHASE === "phase-production-build";

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!hasServiceRole() || isBuildTime()) {
      return { site_name: "Content Autopilot", site_url: null, language: "id" };
    }
    try {
      const sb = createAdminClient();
      const { data } = await sb
        .from("settings")
        .select("site_name,site_url,language")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        return {
          site_name: data.site_name ?? "Content Autopilot",
          site_url: data.site_url ?? null,
          language: data.language ?? "id",
        };
      }
    } catch {
      // ignore and fall back to defaults
    }
    return { site_name: "Content Autopilot", site_url: null, language: "id" };
  },
  ["site-settings"],
  { revalidate: 600, tags: ["settings"] },
);

export const getPublishedArticles = unstable_cache(
  async (limit = 12, offset = 0): Promise<ArticleListItem[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("articles")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      console.error("getPublishedArticles:", error.message);
      return [];
    }
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["published-articles"],
  { revalidate: 300, tags: ["articles"] },
);

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
  ["published-count"],
  { revalidate: 300, tags: ["articles"] },
);

export const getPublishedSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("articles")
      .select("slug")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((r) => r.slug as string);
  },
  ["published-slugs"],
  { revalidate: 300, tags: ["articles"] },
);

export const getArticleBySlug = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const sb = createPublicClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      console.error("getArticleBySlug:", error.message);
      return null;
    }
    return (data as Article) ?? null;
  },
  ["article-by-slug"],
  { revalidate: 300, tags: ["articles"] },
);

export interface ContactSettings {
  whatsapp_number: string | null;
  whatsapp_message: string | null;
}

/** Public WhatsApp contact config (rendered client-side to build wa.me links). */
export const getContactSettings = unstable_cache(
  async (): Promise<ContactSettings> => {
    const empty: ContactSettings = { whatsapp_number: null, whatsapp_message: null };
    if (!hasServiceRole() || isBuildTime()) return empty;
    try {
      const sb = createAdminClient();
      const { data } = await sb
        .from("settings")
        .select("whatsapp_number,whatsapp_message")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        return {
          whatsapp_number: data.whatsapp_number ?? null,
          whatsapp_message: data.whatsapp_message ?? null,
        };
      }
    } catch {
      // fall through to defaults
    }
    return empty;
  },
  ["contact-settings"],
  { revalidate: 600, tags: ["settings"] },
);

export const getRelatedArticles = unstable_cache(
  async (slug: string, limit = 3): Promise<ArticleListItem[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("articles")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .neq("slug", slug)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["related-articles"],
  { revalidate: 300, tags: ["articles"] },
);
