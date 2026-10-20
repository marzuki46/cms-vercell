import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/markdown";
import JsonLd from "@/components/jsonld";
import ArticleCard from "@/components/article-card";
import TableOfContents from "@/components/table-of-contents";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import {
  getArticleBySlug,
  getPublishedSlugs,
  getRelatedArticles,
  getContactSettings,
  getSiteSettings,
} from "@/lib/content";
import { extractToc, plainText } from "@/lib/article-seo";
import { env } from "@/lib/env";
import {
  DEFAULT_LOCALE,
  isLocale,
  ogLocale,
  type Locale,
} from "@/lib/i18n";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return ["id", "en"].flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

function baseUrl() {
  return env.siteUrl || "http://localhost:3000";
}

/** Only offer hreflang for languages where this slug actually exists. */
async function alternatesFor(
  slug: string,
  base: string,
  current: Locale,
): Promise<Record<string, string> | undefined> {
  const slugs = await getPublishedSlugs();
  const out: Record<string, string> = {};
  for (const locale of ["id", "en"] as const) {
    if (locale !== current && slugs.includes(slug)) {
      out[locale] = `${base}/${locale}/blog/${slug}`;
    }
  }
  out[current] = `${base}/${current}/blog/${slug}`;
  out["x-default"] = `${base}/${DEFAULT_LOCALE}/blog/${slug}`;
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;

  const article = await getArticleBySlug(slug, locale);
  if (!article) return { title: "Artikel tidak ditemukan" };

  const base = baseUrl();
  const url = `${base}/${locale}/blog/${slug}`;
  const description =
    article.seo_description ||
    article.excerpt ||
    plainText(article.content_md ?? "", 155);

  const ogImage = `${base}/api/og?title=${encodeURIComponent(
    (article.seo_title || article.title).slice(0, 110),
  )}&excerpt=${encodeURIComponent((article.excerpt ?? "").slice(0, 160))}`;

  return {
    title: article.seo_title || article.title,
    description,
    keywords: article.keywords ?? undefined,
    authors: article.author ? [{ name: article.author }] : undefined,
    alternates: {
      canonical: url,
      languages: await alternatesFor(slug, base, locale),
    },
    openGraph: {
      type: "article",
      title: article.seo_title || article.title,
      description,
      url,
      siteName: undefined,
      locale: ogLocale(locale),
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: article.author ? [article.author] : undefined,
      tags: article.keywords ?? undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seo_title || article.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug, locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const [article, site] = await Promise.all([
    getArticleBySlug(slug, locale),
    getSiteSettings(),
  ]);
  if (!article) notFound();

  const en = locale === "en";
  const base = baseUrl();
  const url = `${base}/${locale}/blog/${slug}`;
  const description =
    article.seo_description ||
    article.excerpt ||
    plainText(article.content_md ?? "", 155);

  const [related, contact] = await Promise.all([
    getRelatedArticles(slug, 3, locale),
    getContactSettings(),
  ]);

  const toc = extractToc(article.content_md ?? "");
  const ogImage = `${base}/api/og?title=${encodeURIComponent(
    (article.seo_title || article.title).slice(0, 110),
  )}&excerpt=${encodeURIComponent((article.excerpt ?? "").slice(0, 160))}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
          inLanguage: en ? "en" : "id-ID",
        },
        url,
        headline: (article.seo_title || article.title).slice(0, 110),
        alternativeHeadline: article.title,
        description,
        image: [ogImage],
        datePublished: article.published_at,
        dateModified: article.updated_at,
        inLanguage: en ? "en" : "id-ID",
        articleSection: article.keywords?.[0] ?? undefined,
        keywords: article.keywords?.join(", "),
        wordCount: article.word_count ?? undefined,
        timeRequired: article.reading_time_minutes
          ? `PT${article.reading_time_minutes}M`
          : undefined,
        author: {
          "@type": "Person",
          name: article.author || site.site_name,
          url: `${base}/${locale}/author/admin`,
        },
        publisher: {
          "@type": "Organization",
          name: site.site_name,
          logo: { "@type": "ImageObject", url: `${base}/api/og` },
        },
        isPartOf: {
          "@type": "Blog",
          "@id": `${base}/${locale}/blog`,
          name: site.site_name,
          url: `${base}/${locale}/blog`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: en ? "Home" : "Beranda",
            item: `${base}/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${base}/${locale}/blog`,
          },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${base}#website`,
        name: site.site_name,
        url: base,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-accent">
              {en ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/blog`} className="hover:text-accent">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{article.title}</li>
        </ol>
      </nav>

      <article className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12">
        <div className="min-w-0">
          <header className="mb-8 border-b border-line pb-6">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <time dateTime={article.published_at ?? undefined}>
                {formatDate(article.published_at, locale)}
              </time>
              {article.reading_time_minutes ? (
                <span>· {article.reading_time_minutes} min read</span>
              ) : null}
              {article.word_count ? <span>· {article.word_count} words</span> : null}
              {article.author ? (
                <span>
                  · Ditulis oleh:{" "}
                  <Link
                    href={`/${locale}/author/admin`}
                    className="font-semibold text-accent hover:underline"
                  >
                    {article.author}
                  </Link>
                </span>
              ) : null}
              {article.category_slug ? (
                <span>
                  · Kategori:{" "}
                  <Link
                    href={`/${locale}/category/${article.category_slug}`}
                    className="font-semibold text-accent hover:underline"
                  >
                    {article.category_slug}
                  </Link>
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            {article.excerpt ? (
              <p className="mt-4 text-base leading-relaxed text-muted">
                {article.excerpt}
              </p>
            ) : null}
            {article.keywords?.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {article.keywords.map((k: string) => (
                  <li
                    key={k}
                    className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted"
                  >
                    {k}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {toc.length >= 3 ? (
            <details className="mb-8 rounded-lg border border-line bg-surface p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {en ? "Table of contents" : "Daftar Isi"}
              </summary>
              <div className="mt-3">
                <TableOfContents items={toc} variant="inline" />
              </div>
            </details>
          ) : null}

          <Markdown content={article.content_md ?? ""} />

          {related.length > 0 ? (
            <section className="mt-14 border-t border-line pt-8">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">
                {en ? "Related articles" : "Artikel terkait"}
              </h2>
              <div className="flex flex-col gap-6">
                {related.map((a) => (
                  <ArticleCard key={a.slug} article={a} locale={locale} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {toc.length >= 3 ? (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                {en ? "Contents" : "Daftar Isi"}
              </h2>
              <TableOfContents items={toc} />
            </div>
          </aside>
        ) : null}
      </article>

      <WhatsAppChatButton
        number={contact.whatsapp_number}
        message={contact.whatsapp_message}
        slug={article.slug}
        label={en ? "Ask via WhatsApp" : "Tanya via WhatsApp"}
      />
    </div>
  );
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
