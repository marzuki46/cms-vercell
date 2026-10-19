import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, env } from "@/lib/env";
import { availableColumns } from "@/lib/settings-schema";
import type { Article, ArticleListItem } from "@/types/db";

const LIST_COLUMNS =
  "slug,title,excerpt,published_at,cover_image_url,reading_time_minutes,keywords,author";

export interface SiteSettings {
  site_name: string;
  site_url: string | null;
  language: string;
  theme_template: "modern" | "editorial" | "minimal";
  google_site_verification: string | null;
}

const isBuildTime = () => process.env.NEXT_PHASE === "phase-production-build";

function fallbackSiteSettings(): SiteSettings {
  return {
    site_name: env.siteName || "Situs Anda",
    site_url: null,
    language: "id",
    theme_template: "modern",
    google_site_verification: env.googleSiteVerification || null,
  };
}

/** Raw DB read. Throws on failure so the fallback is never written to the cache. */
async function loadSiteSettings(): Promise<SiteSettings> {
  const sb = createAdminClient();
  const present = await availableColumns();
  const columns = [
    "site_name",
    "site_url",
    "language",
    ...(present.theme_template ? ["theme_template"] : []),
    ...(present.google_site_verification ? ["google_site_verification"] : []),
  ].join(",");

  const { data, error } = await sb
    .from("settings")
    .select(columns)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return fallbackSiteSettings();

  const row = data as unknown as Record<string, unknown>;
  return {
    site_name: (row.site_name as string | null) || fallbackSiteSettings().site_name,
    site_url: (row.site_url as string | null) ?? null,
    language: (row.language as string) ?? "id",
    theme_template:
      (row.theme_template as "modern" | "editorial" | "minimal") || "modern",
    google_site_verification:
      (row.google_site_verification as string | null) ||
      env.googleSiteVerification ||
      null,
  };
}

const cachedSiteSettings = unstable_cache(loadSiteSettings, ["site-settings"], {
  revalidate: 600,
  tags: ["settings"],
});

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!hasServiceRole() || isBuildTime()) return fallbackSiteSettings();
  try {
    return await cachedSiteSettings();
  } catch (err) {
    console.error("getSiteSettings:", (err as Error).message);
    return fallbackSiteSettings();
  }
}

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
      const present = await availableColumns();
      const columns = [
        ...(present.whatsapp_number ? ["whatsapp_number"] : []),
        ...(present.whatsapp_message ? ["whatsapp_message"] : []),
      ];
      if (columns.length === 0) return empty;

      const { data } = await sb
        .from("settings")
        .select(columns.join(","))
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        const row = data as unknown as Record<string, unknown>;
        return {
          whatsapp_number: (row.whatsapp_number as string | null) ?? null,
          whatsapp_message: (row.whatsapp_message as string | null) ?? null,
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
