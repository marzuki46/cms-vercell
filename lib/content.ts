import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, env } from "@/lib/env";
import { availableColumns } from "@/lib/settings-schema";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { Article, ArticleListItem, Author, Category } from "@/types/db";

const LIST_COLUMNS =
  "slug,title,excerpt,published_at,cover_image_url,reading_time_minutes,keywords,author,category_slug";

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

/**
 * Published articles for one locale.
 * Falls back to the unfiltered list when the `language` column has not been
 * migrated yet, so a fresh install never renders an empty blog.
 */
export const getPublishedArticles = unstable_cache(
  async (
    limit = 12,
    offset = 0,
    locale?: string,
  ): Promise<ArticleListItem[]> => {
    const sb = createPublicClient();
    if (!sb) return [];

    const build = () =>
      sb
        .from("articles")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (!locale) {
      const { data, error } = await build();
      if (error) {
        console.error("getPublishedArticles:", error.message);
        return [];
      }
      return (data ?? []) as unknown as ArticleListItem[];
    }

    if (locale === DEFAULT_LOCALE || locale === "id") {
      const { data, error } = await build().or("language.eq.id,language.is.null");
      if (!error && data && data.length > 0) {
        return data as unknown as ArticleListItem[];
      }
      // Fallback for legacy database without language column or unassigned language
      const fallback = await build();
      return (fallback.data ?? []) as unknown as ArticleListItem[];
    }

    // Strict check for English locale
    const { data, error } = await build().eq("language", locale);
    if (!error) return (data ?? []) as unknown as ArticleListItem[];
    return [];
  },
  ["published-articles"],
  { revalidate: 300, tags: ["articles"] },
);

export const getPublishedCount = unstable_cache(
  async (locale?: string): Promise<number> => {
    const sb = createPublicClient();
    if (!sb) return 0;

    const head = () =>
      sb
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");

    if (!locale) {
      const { count, error } = await head();
      return error ? 0 : count ?? 0;
    }

    if (locale === DEFAULT_LOCALE || locale === "id") {
      const filtered = await head().or("language.eq.id,language.is.null");
      if (!filtered.error && (filtered.count ?? 0) > 0) return filtered.count ?? 0;
      const { count } = await head();
      return count ?? 0;
    }

    const filtered = await head().eq("language", locale);
    if (!filtered.error) return filtered.count ?? 0;
    return 0;
  },
  ["published-count"],
  { revalidate: 300, tags: ["articles"] },
);

export const getPublishedSlugs = unstable_cache(
  async (locale?: string): Promise<string[]> => {
    const sb = createPublicClient();
    if (!sb) return [];

    const build = () =>
      sb
        .from("articles")
        .select("slug")
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (!locale) {
      const { data, error } = await build();
      if (error) return [];
      return (data ?? []).map((r) => r.slug as string);
    }

    if (locale === DEFAULT_LOCALE || locale === "id") {
      const filtered = await build().or("language.eq.id,language.is.null");
      if (!filtered.error && filtered.data && filtered.data.length > 0) {
        return (filtered.data ?? []).map((r) => r.slug as string);
      }
      const { data } = await build();
      return (data ?? []).map((r) => r.slug as string);
    }

    const filtered = await build().eq("language", locale);
    if (!filtered.error) {
      return (filtered.data ?? []).map((r) => r.slug as string);
    }
    return [];
  },
  ["published-slugs"],
  { revalidate: 300, tags: ["articles"] },
);

export const getArticleBySlug = unstable_cache(
  async (slug: string, locale?: string): Promise<Article | null> => {
    const sb = createPublicClient();
    if (!sb) return null;

    const build = () =>
      sb.from("articles").select("*").eq("slug", slug).eq("status", "published");

    if (!locale) {
      const { data, error } = await build().maybeSingle();
      if (error) {
        console.error("getArticleBySlug:", error.message);
        return null;
      }
      return (data as Article) ?? null;
    }

    if (locale === DEFAULT_LOCALE || locale === "id") {
      const localized = await build().or("language.eq.id,language.is.null").maybeSingle();
      if (!localized.error && localized.data) {
        return localized.data as Article;
      }
      const { data } = await build().maybeSingle();
      return (data as Article) ?? null;
    }

    const localized = await build().eq("language", locale).maybeSingle();
    return (localized.data as Article) ?? null;
  },
  ["article-by-slug"],
  { revalidate: 300, tags: ["articles"] },
);

export const getAuthorBySlug = unstable_cache(
  async (slug: string): Promise<Author | null> => {
    const sb = createPublicClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("authors")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return null;
    return (data as Author) ?? null;
  },
  ["author-by-slug"],
  { revalidate: 600, tags: ["settings"] },
);

export const getAuthors = unstable_cache(
  async (): Promise<Author[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("authors")
      .select("*")
      .order("name", { ascending: true });
    if (error) return [];
    return (data as Author[]) ?? [];
  },
  ["authors-list"],
  { revalidate: 600, tags: ["settings"] },
);

export const getArticlesByAuthor = unstable_cache(
  async (authorName: string, limit = 20, locale?: string): Promise<ArticleListItem[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const build = () =>
      sb
        .from("articles")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .eq("author", authorName)
        .order("published_at", { ascending: false })
        .limit(limit);

    if (locale) {
      const { data, error } = await build().eq("language", locale);
      if (!error) return (data ?? []) as unknown as ArticleListItem[];
    }
    const { data } = await build();
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["articles-by-author"],
  { revalidate: 300, tags: ["articles"] },
);

export const getCategories = unstable_cache(
  async (locale?: string): Promise<Category[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const query = sb
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (locale) {
      const { data, error } = await query.eq("language", locale);
      if (!error) return (data ?? []) as Category[];
    }
    const { data } = await query;
    return (data ?? []) as Category[];
  },
  ["categories-list"],
  { revalidate: 600, tags: ["settings"] },
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    const sb = createPublicClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return null;
    return (data as Category) ?? null;
  },
  ["category-by-slug"],
  { revalidate: 600, tags: ["settings"] },
);

export const getArticlesByCategory = unstable_cache(
  async (categorySlug: string, limit = 20): Promise<ArticleListItem[]> => {
    const sb = createPublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("articles")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .eq("category_slug", categorySlug)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["articles-by-category"],
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
  async (slug: string, limit = 3, locale?: string): Promise<ArticleListItem[]> => {
    const sb = createPublicClient();
    if (!sb) return [];

    const build = () =>
      sb
        .from("articles")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(limit);

    if (!locale) {
      const { data, error } = await build();
      return error ? [] : ((data ?? []) as unknown as ArticleListItem[]);
    }

    const filtered = await build().eq("language", locale);
    if (!filtered.error) {
      return (filtered.data ?? []) as unknown as ArticleListItem[];
    }

    const fallback = await build();
    return fallback.error ? [] : ((fallback.data ?? []) as unknown as ArticleListItem[]);
  },
  ["related-articles"],
  { revalidate: 300, tags: ["articles"] },
);
