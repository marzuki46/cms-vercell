import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, env } from "@/lib/env";
import { availableColumns } from "@/lib/settings-schema";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { Article, ArticleListItem, Author, AuthorProfile, Category, HomeCopy } from "@/types/db";

const LIST_COLUMNS_WITH_CAT =
  "id,slug,title,excerpt,published_at,updated_at,created_at,cover_image_url,reading_time_minutes,keywords,author,category_slug,language,translation_of";
const LIST_COLUMNS_BASE =
  "id,slug,title,excerpt,published_at,updated_at,created_at,cover_image_url,reading_time_minutes,keywords,author,language,translation_of";
const LIST_COLUMNS_LEGACY =
  "id,slug,title,excerpt,published_at,updated_at,created_at,cover_image_url,reading_time_minutes,keywords,author";

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
  author_profile?: AuthorProfile | null;
}

const isBuildTime = () => process.env.NEXT_PHASE === "phase-production-build";

function fallbackSiteSettings(): SiteSettings {
  return {
    site_name: env.siteName || "Mas Boss",
    site_url: null,
    language: "id",
    theme_template: "modern",
    google_site_verification: env.googleSiteVerification || null,
    home_copy: null,
    author_profile: null,
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
    "audience",
    ...(present.theme_template ? ["theme_template"] : []),
    ...(present.google_site_verification ? ["google_site_verification"] : []),
    ...(present.home_copy ? ["home_copy"] : []),
    ...(present.author_profile ? ["author_profile"] : []),
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

  let author_profile: AuthorProfile | null = null;
  if (present.author_profile && row.author_profile) {
    author_profile = row.author_profile as AuthorProfile;
  } else if (
    row.audience &&
    typeof row.audience === "string" &&
    row.audience.startsWith("__AUTHOR_PROFILE__:")
  ) {
    try {
      author_profile = JSON.parse(row.audience.slice(19));
    } catch {
      author_profile = null;
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
    author_profile,
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

    // STRICT ISOLATION FOR ENGLISH: never fallback to Indonesian articles
    if (targetLang === "en") {
      let res = await queryArticles(LIST_COLUMNS_WITH_CAT, "en");
      if (res.error && (res.error.message.includes("category_slug") || res.error.message.includes("translation_of"))) {
        res = await queryArticles(LIST_COLUMNS_BASE, "en");
      }
      if (res.error && res.error.message.includes("translation_of")) {
        res = await queryArticles(LIST_COLUMNS_LEGACY, "en");
      }
      if (res.error) {
        // If language column doesn't exist, there are definitely 0 English articles
        return [];
      }
      return (res.data ?? []) as unknown as ArticleListItem[];
    }

    // Default locale (id) query with schema resilience
    let res = await queryArticles(LIST_COLUMNS_WITH_CAT, "id");
    if (res.error && (res.error.message.includes("category_slug") || res.error.message.includes("translation_of"))) {
      res = await queryArticles(LIST_COLUMNS_BASE, "id");
    }
    if (res.error && res.error.message.includes("translation_of")) {
      res = await queryArticles(LIST_COLUMNS_LEGACY, "id");
    }
    if (res.error && res.error.message.includes("language")) {
      res = await queryArticles(LIST_COLUMNS_LEGACY, "all");
    }

    if ((!res.data || res.data.length === 0) && (targetLang === "id" || targetLang === DEFAULT_LOCALE)) {
      const fallback = await queryArticles(LIST_COLUMNS_LEGACY, "all");
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

    // Strict count for English: never fallback to all
    if (targetLang === "en") {
      const res = await countQuery("en");
      if (res.error) return 0;
      return res.count ?? 0;
    }

    let res = await countQuery("id");
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

    // Strict slugs for English: never fallback to all/ID
    if (targetLang === "en") {
      const res = await build("en");
      if (res.error || !res.data) return [];
      return res.data.map((r) => r.slug as string);
    }

    let res = await build("id");
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

    // Strict fetch for English: MUST have language = 'en'
    if (targetLang === "en") {
      const res = await build("en").maybeSingle();
      if (res.error || !res.data) return null;
      const row = res.data as Article;
      if (row.language !== "en") return null;
      return row;
    }

    // Default Indonesian query
    let res = await build("id").maybeSingle();
    if (res.error && res.error.message.includes("language")) {
      res = await build("all").maybeSingle();
    }

    if (!res.data && (targetLang === "id" || targetLang === DEFAULT_LOCALE)) {
      const fallback = await build("all").maybeSingle();
      if (!fallback.error && fallback.data) {
        const row = fallback.data as Article;
        // Do not serve explicit English article on Indonesian URL either
        if (row.language && row.language !== "id") return null;
        return row;
      }
    }

    return (res.data as Article) ?? null;
  },
  ["article-by-slug"],
  { revalidate: 300, tags: ["articles"] },
);

/**
 * Find the paired translated article across languages.
 * Links ID <-> EN even if the URL slugs are completely different.
 */
export const getArticleTranslation = unstable_cache(
  async (slug: string, locale: string): Promise<{ locale: "id" | "en"; slug: string } | null> => {
    const sb = getContentClient();
    if (!sb) return null;

    const current = await getArticleBySlug(slug, locale);
    if (!current) return null;

    const targetLang: "id" | "en" = locale === "id" ? "en" : "id";

    try {
      // 1. If current is EN and points to source ID article
      if (locale === "en" && current.translation_of) {
        const { data } = await sb
          .from("articles")
          .select("slug, status, language")
          .eq("id", current.translation_of)
          .eq("status", "published")
          .maybeSingle();
        if (data?.slug) return { locale: "id", slug: data.slug };
      }

      // 2. If current is ID, find EN article that translated it
      if (locale === "id") {
        const { data } = await sb
          .from("articles")
          .select("slug, status, language")
          .eq("translation_of", current.id)
          .eq("status", "published")
          .maybeSingle();
        if (data?.slug) return { locale: "en", slug: data.slug };
      }
    } catch {
      // Ignore if column translation_of does not exist yet
    }

    // 3. Fallback: check if same slug is published in target language
    const identical = await getArticleBySlug(slug, targetLang);
    if (identical && identical.status === "published") {
      return { locale: targetLang, slug };
    }

    return null;
  },
  ["article-translation-pair"],
  { revalidate: 300, tags: ["articles"] },
);

async function buildConfiguredAuthor(slug: string, locale?: string): Promise<Author> {
  let site: SiteSettings;
  try {
    site = await getSiteSettings();
  } catch {
    site = fallbackSiteSettings();
  }

  const p = site.author_profile;
  const isEn = locale === "en" || slug.includes("en");

  let role = isEn
    ? (p?.en_role || "Senior Content Editor & Researcher")
    : (p?.role || "Tim Riset & Editor Publikasi");

  let bio = isEn
    ? (p?.en_bio || `Official editorial team of ${site.site_name} dedicated to providing data-driven guides, factual reviews, and trusted insights.`)
    : (p?.bio || `Tim editorial dan penulis resmi ${site.site_name} berdedikasi untuk menyajikan informasi terpercaya, ulasan faktual, panduan mendalam, dan rekomendasi terbaik bagi para pembaca.`);

  let credentials = isEn && p?.en_credentials && p.en_credentials.length > 0
    ? p.en_credentials
    : (p?.credentials && p.credentials.length > 0
        ? p.credentials
        : (isEn
            ? [
                "Verified Content Creator",
                "SEO & Industry Research Specialist",
                "Editorial Board Member",
              ]
            : [
                "Verified Content Creator",
                "Spesialis Riset & SEO Industri",
                "Dewan Redaksi Resmi",
              ]));

  return {
    id: "configured-admin",
    slug,
    name: p?.name || site.site_name || "Admin Editorial",
    role,
    bio,
    avatar_url: p?.avatar_url || null,
    credentials,
    social_links: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const getAuthorBySlug = unstable_cache(
  async (slug: string, locale?: string): Promise<Author | null> => {
    const sb = getContentClient();
    if (!sb) return await buildConfiguredAuthor(slug, locale);

    try {
      const { data, error } = await sb
        .from("authors")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        const author = data as Author;
        const isEn = locale === "en";
        // If English, translate defaults or fallback
        if (isEn && (!author.bio || author.bio.includes("Tim editorial"))) {
          return await buildConfiguredAuthor(slug, "en");
        }
        return author;
      }
    } catch {
      // Table missing or DB error
    }

    // Always fallback to configured author so the page never 404s
    return await buildConfiguredAuthor(slug, locale);
  },
  ["author-by-slug"],
  { revalidate: 600, tags: ["settings"] },
);

export const getAuthors = unstable_cache(
  async (): Promise<Author[]> => {
    const sb = getContentClient();
    if (!sb) return [await buildConfiguredAuthor("admin")];
    try {
      const { data, error } = await sb
        .from("authors")
        .select("*")
        .order("name", { ascending: true });
      if (!error && data && data.length > 0) return data as Author[];
    } catch {
      // Table missing
    }
    return [await buildConfiguredAuthor("admin")];
  },
  ["authors-list"],
  { revalidate: 600, tags: ["settings"] },
);

export const getArticlesByAuthor = unstable_cache(
  async (authorName: string, limit = 24, locale?: string): Promise<ArticleListItem[]> => {
    const sb = getContentClient();
    if (!sb) return [];
    const targetLang = locale || "id";

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

      if (targetLang === "id" || targetLang === DEFAULT_LOCALE) {
        q = q.or("language.eq.id,language.is.null");
      } else if (targetLang && targetLang !== "all") {
        q = q.eq("language", targetLang);
      }
      return q;
    };

    let { data, error } = await build(LIST_COLUMNS_WITH_CAT, true);
    if (error && error.message.includes("category_slug")) {
      const retry = await build(LIST_COLUMNS_BASE, true);
      data = retry.data;
      error = retry.error;
    }

    // Fallback: If authorName did not match (e.g. author in db is "Admin" while display name is site_name),
    // or if 0 rows returned, fetch all published articles for this locale
    if (!error && (!data || data.length === 0)) {
      let general = await build(LIST_COLUMNS_WITH_CAT, false);
      if (general.error && general.error.message.includes("category_slug")) {
        general = await build(LIST_COLUMNS_BASE, false);
      }
      if (!general.error && general.data && general.data.length > 0) {
        return general.data as unknown as ArticleListItem[];
      }
    }

    if (error) return [];
    return (data ?? []) as unknown as ArticleListItem[];
  },
  ["articles-by-author-v2"],
  { revalidate: 60, tags: ["articles"] },
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
  async (categorySlug: string, limit = 20, locale?: string): Promise<ArticleListItem[]> => {
    const sb = getContentClient();
    if (!sb) return [];
    const targetLang = locale || "id";

    const build = (cols: string) => {
      let q = sb
        .from("articles")
        .select(cols)
        .eq("status", "published")
        .eq("category_slug", categorySlug)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (targetLang === "id" || targetLang === DEFAULT_LOCALE) {
        q = q.or("language.eq.id,language.is.null");
      } else if (targetLang && targetLang !== "all") {
        q = q.eq("language", targetLang);
      }
      return q;
    };

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
