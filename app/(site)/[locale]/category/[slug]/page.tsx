import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import JsonLd from "@/components/jsonld";
import {
  getCategoryBySlug,
  getArticlesByCategory,
  getCategories,
} from "@/lib/content";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };

  const base = env.siteUrl || "http://localhost:3000";
  const title = `${category.name} — Topik & Panduan Lengkap`;
  const description =
    category.description ||
    `Arsip artikel komprehensif, wawasan industri, dan panduan topik ${category.name}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${locale}/category/${slug}`,
      languages: {
        id: `${base}/id/category/${slug}`,
        en: `${base}/en/category/${slug}`,
        "x-default": `${base}/${DEFAULT_LOCALE}/category/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${base}/${locale}/category/${slug}`,
    },
  };
}

export default async function CategoryClusterPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const [category, allCategories] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(locale),
  ]);
  if (!category) notFound();

  const articles = await getArticlesByCategory(slug, 30);
  const en = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";
  const url = `${base}/${locale}/category/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: category.name,
        description: category.description ?? undefined,
        isPartOf: { "@id": `${base}#website` },
        inLanguage: en ? "en" : "id-ID",
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
            name: en ? "Blog" : "Blog",
            item: `${base}/${locale}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: category.name,
            item: url,
          },
        ],
      },
    ],
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
          <li>
            <Link href={`/${locale}/blog`} className="hover:text-accent">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{category.name}</li>
        </ol>
      </nav>

      <header className="mb-10 rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-0.5 text-xs font-semibold text-accent">
          <span>📁 {en ? "Topic Cluster" : "Klaster Topik"}</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            {category.description}
          </p>
        ) : null}

        {allCategories.length > 1 ? (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line/60 pt-4">
            <span className="self-center text-xs text-muted">
              {en ? "Explore other topics:" : "Jelajahi topik lain:"}
            </span>
            {allCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/${locale}/category/${c.slug}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  c.slug === slug
                    ? "bg-accent text-accent-fg"
                    : "border border-line bg-background text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <section>
        <div className="mb-8 flex items-baseline justify-between border-b border-line pb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {en ? "Articles in this cluster" : "Artikel dalam klaster ini"}
          </h2>
          <span className="text-xs text-muted">
            {articles.length} {en ? "articles" : "artikel"}
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-line p-10 text-center text-sm text-muted">
            {en
              ? "Articles are currently being prepared for this topic."
              : "Artikel untuk klaster topik ini sedang disiapkan oleh tim redaksi."}
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
