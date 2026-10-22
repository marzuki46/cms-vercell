import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import JsonLd from "@/components/jsonld";
import { getPublishedArticles, getPublishedCount, getSiteSettings } from "@/lib/content";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 60;

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
  const isEn = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";

  const title = isEn
    ? "Tech Blog & Development Insights by Tri Marzuki"
    : "Blog Teknologi, Tutorial Web & SEO oleh Tri Marzuki";

  const description = isEn
    ? "Explore technical guides, web development tutorials (Next.js, LMS, School Portals, Android), system architecture, AI automation, and Google Maps SEO strategies written by Tri Marzuki."
    : "Kumpulan artikel edukatif, panduan pembuatan website sekolah, LMS, company profile, aplikasi Android, custom sistem, setup AI, dan strategi optimasi SEO Google Maps oleh Tri Marzuki.";

  return {
    title,
    description,
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
      description,
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

  const isEn = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${base}/${locale}/blog`,
        url: `${base}/${locale}/blog`,
        name: isEn
          ? "Tech & Development Blog by Tri Marzuki"
          : "Blog Teknologi & Panduan SEO oleh Tri Marzuki",
        description: isEn
          ? "Practical web engineering, Android app development, custom system tutorials, and SEO strategies."
          : "Ulasan teknis, panduan website, aplikasi Android, dan strategi SEO Google Maps.",
        isPartOf: { "@id": `${base}#website` },
        inLanguage: isEn ? "en" : "id-ID",
      },
      {
        "@type": "Person",
        "@id": `${base}/${locale}#person`,
        name: "Tri Marzuki",
        url: `${base}/${locale}/about`,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16">
      <JsonLd data={jsonLd} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-accent">
              {isEn ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Blog</li>
        </ol>
      </nav>

      {/* Blog Hero Header */}
      <div className="mb-10 border-b border-line pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <span>📚 Technical Knowledge Base</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {isEn
            ? "Tech & Development Insights"
            : "Wawasan & Panduan Teknologi"}
        </h1>
        <p className="mt-3 text-base text-muted sm:text-lg">
          {isEn
            ? `Curated articles, architecture guides, and SEO walkthroughs by Tri Marzuki. Exploring web development, school portals, LMS, Android apps, AI setup, and Google Maps optimization.`
            : `Kumpulan ${total} artikel, panduan koding, dan strategi optimasi oleh Tri Marzuki. Membedah pembuatan website sekolah, LMS, company profile, aplikasi Android, sistem kustom, hingga dominasi SEO Google Maps.`}
        </p>

        {query ? (
          <p className="mt-4 text-sm text-muted">
            {isEn ? "Results for" : "Hasil pencarian"}:{" "}
            <strong className="text-foreground">“{query}”</strong> —{" "}
            {articles.length} {isEn ? "found" : "ditemukan"}
          </p>
        ) : null}
      </div>

      {/* Articles Grid */}
      {articles.length === 0 ? (
        <div className="rounded-xl border border-line p-12 text-center text-muted">
          {query
            ? isEn
              ? "No articles matched your search query."
              : "Tidak ada artikel yang cocok dengan pencarian Anda."
            : isEn
              ? "No articles published in this language yet."
              : "Belum ada artikel yang diterbitkan dalam bahasa ini."}
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} locale={locale} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !query ? (
        <nav
          aria-label={isEn ? "Pagination" : "Navigasi halaman"}
          className="mt-14 flex flex-wrap items-center gap-2 text-sm"
        >
          <Link
            href={`/${locale}/blog`}
            aria-current="page"
            className="rounded-md border border-accent bg-accent px-3 py-1.5 text-accent-fg font-semibold"
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
