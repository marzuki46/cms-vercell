import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import JsonLd from "@/components/jsonld";
import { getPublishedArticles, getPublishedCount, getSiteSettings } from "@/lib/content";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 300;

export const BLOG_PAGE_SIZE = 10;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const base = env.siteUrl || "http://localhost:3000";
  const site = await getSiteSettings();

  const title = locale === "en" ? "All Articles" : "Semua Artikel";

  return {
    title,
    description:
      locale === "en"
        ? `Browse the complete archive of articles and in-depth guides from ${site.site_name}.`
        : `Arsip lengkap artikel dan panduan dari ${site.site_name}.`,
    alternates: {
      canonical: `${base}/${locale}/blog`,
      languages: {
        id: `${base}/id/blog`,
        en: `${base}/en/blog`,
        "x-default": `${base}/${DEFAULT_LOCALE}/blog`,
      },
    },
    openGraph: {
      title,
      url: `${base}/${locale}/blog`,
      type: "website",
    },
  };
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [total, articles] = await Promise.all([
    getPublishedCount(locale),
    getPublishedArticles(BLOG_PAGE_SIZE, 0, locale),
  ]);

  const en = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${base}/${locale}/blog`,
    name: en ? "All Articles" : "Semua Artikel",
    isPartOf: { "@id": `${base}#website` },
    inLanguage: en ? "en" : "id-ID",
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-accent">
              {en ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Blog</li>
        </ol>
      </nav>

      <div className="mb-10 border-b border-line pb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          {en ? "All Articles" : "Semua Artikel"}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {en
            ? `Browse our archive of ${total} articles, guides and analyses.`
            : `Arsip lengkap ${total} artikel, panduan, dan ulasan.`}
        </p>

        {query ? (
          <p className="mt-3 text-sm text-muted">
            {en ? "Results for" : "Hasil pencarian"}:{" "}
            <strong className="text-foreground">“{query}”</strong> —{" "}
            {articles.length} {en ? "found" : "ditemukan"}
          </p>
        ) : null}
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-line p-12 text-center text-muted">
          {query
            ? en
              ? "No articles matched your search."
              : "Tidak ada artikel yang cocok dengan pencarian Anda."
            : en
              ? "No articles have been published yet."
              : "Belum ada artikel yang diterbitkan."}
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} locale={locale} />
          ))}
        </div>
      )}

      {totalPages > 1 && !query ? (
        <nav
          aria-label={en ? "Pagination" : "Navigasi halaman"}
          className="mt-12 flex flex-wrap items-center gap-2 text-sm"
        >
          <Link
            href={`/${locale}/blog`}
            aria-current="page"
            className="rounded-md border border-accent bg-accent px-3 py-1.5 text-accent-fg"
          >
            1
          </Link>
          {Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => i + 2).map(
            (n) => (
              <Link
                key={n}
                href={`/${locale}/blog/page/${n}`}
                className="rounded-md border border-line px-3 py-1.5 transition hover:border-accent hover:text-accent"
              >
                {n}
              </Link>
            ),
          )}
        </nav>
      ) : null}
    </div>
  );
}
