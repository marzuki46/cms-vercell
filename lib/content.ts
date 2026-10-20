import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, env } from "@/lib/env";
import { availableColumns } from "@/lib/settings-schema";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { Article, ArticleListItem, Author, Category, HomeCopy } from "@/types/db";

const LIST_COLUMNS_WITH_CAT =
  "slug,title,excerpt,published_at,created_at,cover_image_url,reading_time_minutes,keywords,author,category_slug";
const LIST_COLUMNS_BASE =
  "slug,title,excerpt,published_at,created_at,cover_image_url,reading_time_minutes,keywords,author";

/** Use service role on server if available to bypass RLS failures, fallback to public client */
function getContentClient() {
  if (hasServiceRole()) return createAdminClient();
  return createPublicClient();
}

export interface SiteSettings {
  site_name: string;
  site_url: string | null;
  language: string;
  theme_template: "modern" | "editorial" | "minimal";
  google_site_verification: string | null;
  home_copy?: HomeCopy | null;
}

const isBuildTime = () => process.env.NEXT_PHASE === "phase-production-build";

function fallbackSiteSettings(): SiteSettings {
  return {
    site_name: env.siteName || "Situs Anda",
    site_url: null,
    language: "id",
    theme_template: "modern",
    google_site_verification: env.googleSiteVerification || null,
    home_copy: null,
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
    "brand_voice",
    ...(present.theme_template ? ["theme_template"] : []),
    ...(present.google_site_verification ? ["google_site_verification"] : []),
    ...(present.home_copy ? ["home_copy"] : []),
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
  let home_copy: HomeCopy | null = null;
  if (present.home_copy && row.home_copy) {
    home_copy = row.home_copy as HomeCopy;
  } else if (
    row.brand_voice &&
    typeof row.brand_voice === "string" &&
    row.brand_voice.startsWith("__HOME_COPY__:")
  ) {
    try {
      home_copy = JSON.parse(row.brand_voice.slice(14));
    } catch {
      home_copy = null;
    }
  }

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
    home_copy,
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
 * Tolerates missing `category_slug` or `language` columns seamlessly.
 */
export const getPublishedArticles = unstable_cache(
  async (
    limit = 12,
    offset = 0,
    locale?: string,
  ): Promise<ArticleListItem[]> => {
    const sb = getContentClient();
    if (!sb) return [];

    const queryArticles = async (columns: string, langFilter?: string) => {
      let q = sb
        .from("articles")
        .select(columns)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (langFilter === "id") {
        q = q.or("language.eq.id,language.is.null");
      } else if (langFilter && langFilter !== "all") {
        q = q.eq("language", langFilter);
      }

      return await q;
    };

    const targetLang = locale || "id";
    // 1. Try with category_slug and target locale
    let res = await queryArticles(LIST_COLUMNS_WITH_CAT, targetLang);

    // If category_slug column is missing, retry with base columns
    if (res.error && res.error.message.includes("category_slug")) {
      res = await queryArticles(LIST_COLUMNS_BASE, targetLang);
    }

    // If language column is missing and error occurred, retry without language filter
    if (res.error && res.error.message.includes("language")) {
      res = await queryArticles(LIST_COLUMNS_BASE, "all");
    }

    // If locale is ID and returned 0 articles, try unconditional query (legacy rows)
    if ((!res.data || res.data.length === 0) && (targetLang === "id" || targetLang === DEFAULT_LOCALE)) {
      const fallback = await queryArticles(LIST_COLUMNS_BASE, "all");
      if (!fallback.error && fallback.data && fallback.data.length > 0) {
        return fallback.data as unknown as ArticleListItem[];
      }
    }

    if (res.error) {
      console.error("getPublishedArticles error:", res.error.message);
      return [];
    }

    return (res.data ?? []) as unknown as ArticleListItem[];
  },
  ["published-articles"],
  { revalidate: 300, tags: ["articles"] },
);

export const getPublishedCount = unstable_cache(
  async (locale?: string): Promise<number> => {
    const sb = getContentClient();
    if (!sb) return 0;

    const countQuery = async (langFilter?: string) => {
      let q = sb
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");

      if (langFilter === "id") {
        q = q.or("language.eq.id,language.is.null");
      } else if (langFilter && langFilter !== "all") {
        q = q.eq("language", langFilter);
      }

      return await q;
    };

    const targetLang = locale || "id";
    let res = await countQuery(targetLang);

    if (res.error && res.error.message.includes("language")) {
      res = await countQuery("all");
    }

    if ((res.count ?? 0) === 0 && (targetLang === "id" || targetLang === DEFAULT_LOCALE)) {
      const fallback = await countQuery("all");
      if (!fallback.error && (fallback.count ?? 0) > 0) {
        return fallback.count ?? 0;
      }
    }

    return res.count ?? 0;
  },
  ["published-count"],
  { revalidate: 300, tags: ["articles"] },
);

export const getPublishedSlugs = unstable_cache(
  async (locale?: string): Promise<string[]> => {
    const sb = getContentClient();
    if (!sb) return [];

    const build = (langFilter?: string) => {
      let q = sb
        .from("articles")
        .select("slug")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (langFilter === "id") {
        q = q.or("language.eq.id,language.is.null");
      } else if (langFilter && langFilter !== "all") {
        q = q.eq("language", langFilter);
      }
      return q;
    };

    const targetLang = locale || "id";
    let res = await build(targetLang);
    if (res.error && res.error.message.includes("language")) {
      res = await build("all");
    }

    if ((!res.data || res.data.length === 0) && (targetLang === "id" || targetLang === DEFAULT_LOCALE)) {
      const fallback = await build("all");
      if (!fallback.error && fallback.data) {
        return fallback.data.map((r) => r.slug as string);
      }
    }

    return (res.data ?? []).map((r) => r.slug as string);
  },
  ["published-slugs"],
  { revalidate: 300, tags: ["articles"] },
);

export const getArticleBySlug = unstable_cache(
  async (slug: string, locale?: string): Promise<Article | null> => {
    const sb = getContentClient();
    if (!sb) return null;

    const build = (langFilter?: string) => {
      let q = sb.from("articles").select("*").eq("slug", slug).eq("status", "published");
      if (langFilter === "id") {
        q = q.or("language.eq.id,language.is.null");
      } else if (langFilter && langFilter !== "all") {
        q = q.eq("language", langFilter);
      }
      return q;
    };

    const targetLang = locale || "id";
    let res = await build(targetLang).maybeSingle();
    if (res.error && res.error.message.includes("language")) {
      res = await build("all").maybeSingle();
    }

    if (!res.data && (targetLang === "id" || targetLang === DEFAULT_LOCALE)) {
      const fallback = await build("all").maybeSingle();
      if (!fallback.error && fallback.data) {
        return fallback.data as Article;
      }
    }

    return (res.data as Article) ?? null;
  },
  ["article-by-slug"],
  { revalidate: 300, tags: ["articles"] },
);

function createDefaultAuthor(slug: string): Author {
  const isEn = slug.includes("en");
  return {
    id: "default-admin",
    slug,
    name: "Admin Editorial",
    role: isEn ? "Senior Content Editor & Researcher" : "Tim Riset & Editor Publikasi",
    bio: isEn
      ? "Official editorial team and verified publisher dedicated to providing data-driven guides, factual reviews, and trusted insights."
      : "Tim editorial dan penulis resmi berdedikasi untuk menyajikan informasi terpercaya, ulasan faktual, panduan mendalam, dan rekomendasi terbaik bagi para pembaca.",
    avatar_url: null,
    credentials: [
      "Verified Content Creator",
      "SEO & Industry Research Specialist",
      "Editorial Board Member",
    ],
    social_links: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const getAuthorBySlug = unstable_cache(
  async (slug: string): Promise<Author | null> => {
    const sb = getContentClient();
    if (!sb) return createDefaultAuthor(slug);

    try {
      const { data, error } = await sb
        .from("authors")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) return data as Author;
    } catch {
      // Table missing or DB error
    }

    // Fallback for default author like 'admin' so the page never 404s
    if (
      slug === "admin" ||
      slug === "author" ||
      slug === "redaksi" ||
      slug === "editor" ||
      slug === "tim-redaksi"
    ) {
      return createDefaultAuthor(slug);
    }

    return createDefaultAuthor(slug);
  },
  ["author-by-slug"],
  { revalidate: 600, tags: ["settings"] },
);

export const getAuthors = unstable_cache(
  async (): Promise<Author[]> => {
    const sb = getContentClient();
    if (!sb) return [createDefaultAuthor("admin")];
    try {
      const { data, error } = await sb
        .from("authors")
        .select("*")
        .order("name", { ascending: true });
      if (!error && data && data.length > 0) return data as Author[];
    } catch {
      // Table missing
    }
    return [createDefaultAuthor("admin")];
  },
  ["authors-list"],
  { revalidate: 600, tags: ["settings"] },
);

export const getArticlesByAuthor = unstable_cache(
  async (authorName: string, limit = 20, locale?: string): Promise<ArticleListItem[]> => {
    const sb = getContentClient();
    if (!sb) return [];
    const build = (cols: string, useAuthorFilter: boolean) => {
      let q = sb
        .from("articles")
        .select(cols)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (useAuthorFilter && authorName) {
        q = q.ilike("author", `%${authorName}%`);
      }
      if (locale === "id" || locale === DEFAULT_LOCALE) {
        q = q.or("language.eq.id,language.is.null");
      } else if (locale && locale !== "all") {
        q = q.eq("language", locale);
      }
      return q;
    };

    let { data, error } = await build(LIST_COLUMNS_WITH_CAT, true);
    if (error && error.message.includes("category_slug")) {
      const retry = await build(LIST_COLUMNS_BASE, true);
      data = retry.data;
      error = retry.error;
    }

    // If no articles found with strict author name, fallback to all published articles
    if (!error && (!data || data.length === 0)) {
      const general = await build(LIST_COLUMNS_BASE, false);
      if (!general.error && general.data) {
        return general.data as unknown as ArticleListItem[];
      }
    }

    if (error) return [];
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["articles-by-author"],
  { revalidate: 300, tags: ["articles"] },
);

export const getCategories = unstable_cache(
  async (locale?: string): Promise<Category[]> => {
    const sb = getContentClient();
    if (!sb) return [];
    const query = sb
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (locale) {
      const { data, error } = await query.eq("language", locale);
      if (!error) return (data ?? []) as Category[];
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as Category[];
  },
  ["categories-list"],
  { revalidate: 600, tags: ["settings"] },
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    const sb = getContentClient();
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
    const sb = getContentClient();
    if (!sb) return [];
    const build = (cols: string) =>
      sb
        .from("articles")
        .select(cols)
        .eq("status", "published")
        .eq("category_slug", categorySlug)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);

    let { data, error } = await build(LIST_COLUMNS_WITH_CAT);
    if (error && error.message.includes("category_slug")) {
      return [];
    }
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
    const sb = getContentClient();
    if (!sb) return [];

    const build = (cols: string) => {
      let q = sb
        .from("articles")
        .select(cols)
        .eq("status", "published")
        .neq("slug", slug)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (locale === "id" || locale === DEFAULT_LOCALE) {
        q = q.or("language.eq.id,language.is.null");
      } else if (locale && locale !== "all") {
        q = q.eq("language", locale);
      }
      return q;
    };

    const res = await build(LIST_COLUMNS_WITH_CAT);
    let data = res.data;
    let error = res.error;
    if (error && error.message.includes("category_slug")) {
      const retry = await build(LIST_COLUMNS_BASE);
      data = retry.data as any;
      error = retry.error;
    }
    if (error && error.message.includes("language")) {
      const retry = await sb
        .from("articles")
        .select(LIST_COLUMNS_BASE)
        .eq("status", "published")
        .neq("slug", slug)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      data = retry.data as any;
      error = retry.error;
    }

    if (error) return [];
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["related-articles"],
  { revalidate: 300, tags: ["articles"] },
);
