import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import { getPublishedArticles, getPublishedCount } from "@/lib/content";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 60;

export function generateStaticParams() {
  return [
    { locale: "id", page: "2" },
    { locale: "en", page: "2" },
  ];
}

const PAGE_SIZE = 10;

interface Props {
  params: Promise<{ locale: string; page: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, page } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const n = Number(page);
  const base = env.siteUrl || "http://localhost:3000";

  const title =
    n > 1
      ? locale === "en"
        ? `Articles — Page ${n}`
        : `Artikel — Halaman ${n}`
      : locale === "en"
        ? "All Articles"
        : "Semua Artikel";

  return {
    title,
    alternates: {
      canonical: n > 1 ? `${base}/${locale}/blog/page/${n}` : `${base}/${locale}/blog`,
      languages: {
        id: `${base}/id/blog/page/${n}`,
        en: `${base}/en/blog/page/${n}`,
        "x-default": `${base}/${DEFAULT_LOCALE}/blog/page/${n}`,
      },
    },
    robots: n > 1 ? { index: true, follow: true } : { index: true, follow: true },
  };
}

export default async function BlogPagedPage({ params }: Props) {
  const { locale: raw, page } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const n = Number(page);
  if (!Number.isInteger(n) || n < 2) notFound();

  const total = await getPublishedCount(locale);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (n > totalPages) notFound();

  const articles = await getPublishedArticles(PAGE_SIZE, (n - 1) * PAGE_SIZE, locale);
  const en = locale === "en";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
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
          <li className="text-foreground">{n}</li>
        </ol>
      </nav>

      <h1 className="mb-10 border-b border-line pb-8 text-3xl font-extrabold tracking-tight text-foreground">
        {en ? "All Articles" : "Semua Artikel"}{" "}
        <span className="text-muted">· {en ? `Page ${n}` : `Halaman ${n}`}</span>
      </h1>

      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={a} locale={locale} />
        ))}
      </div>

      <nav
        aria-label={en ? "Pagination" : "Navigasi halaman"}
        className="mt-12 flex flex-wrap items-center gap-2 text-sm"
      >
        {n > 2 ? (
          <Link
            href={`/${locale}/blog/page/${n - 1}`}
            className="rounded-md border border-line px-3 py-1.5 transition hover:border-accent hover:text-accent"
          >
            ← {en ? "Previous" : "Sebelumnya"}
          </Link>
        ) : (
          <Link
            href={`/${locale}/blog`}
            className="rounded-md border border-line px-3 py-1.5 transition hover:border-accent hover:text-accent"
          >
            ← {en ? "Previous" : "Sebelumnya"}
          </Link>
        )}

        <Link
          href={`/${locale}/blog`}
          aria-current={n === 1 ? "page" : undefined}
          className={`rounded-md border px-3 py-1.5 ${
            n === 1
              ? "border-accent bg-accent text-accent-fg"
              : "border-line hover:border-accent hover:text-accent"
          }`}
        >
          1
        </Link>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((x) => x !== 1)
          .map((x) => (
            <Link
              key={x}
              href={`/${locale}/blog/page/${x}`}
              aria-current={x === n ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 ${
                x === n
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line hover:border-accent hover:text-accent"
              }`}
            >
              {x}
            </Link>
          ))}

        {n < totalPages ? (
          <Link
            href={`/${locale}/blog/page/${n + 1}`}
            className="rounded-md border border-line px-3 py-1.5 transition hover:border-accent hover:text-accent"
          >
            {en ? "Next" : "Berikutnya"} →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
