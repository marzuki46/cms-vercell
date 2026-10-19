import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/markdown";
import JsonLd from "@/components/jsonld";
import ArticleCard, { formatDate } from "@/components/article-card";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import {
  getArticleBySlug,
  getPublishedSlugs,
  getRelatedArticles,
  getContactSettings,
  getSiteSettings,
} from "@/lib/content";
import { env } from "@/lib/env";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

function baseUrl() {
  return env.siteUrl || "http://localhost:3000";
}

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [article, site] = await Promise.all([
    getArticleBySlug(slug),
    getSiteSettings(),
  ]);
  if (!article) return { title: "Artikel tidak ditemukan" };

  const url = `${baseUrl()}/blog/${article.slug}`;
  const description =
    article.seo_description ||
    article.excerpt ||
    `Artikel dari ${site.site_name}.`;

  return {
    title: article.seo_title || article.title,
    description,
    keywords: article.keywords ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.seo_title || article.title,
      description,
      url,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: article.author ? [article.author] : undefined,
      tags: article.keywords ?? undefined,
      siteName: site.site_name,
    },
    twitter: {
      card: "summary_large_image",
      title: article.seo_title || article.title,
      description,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, site] = await Promise.all([
    getArticleBySlug(slug),
    getSiteSettings(),
  ]);
  if (!article) notFound();

  const url = `${baseUrl()}/blog/${article.slug}`;
  const description =
    article.seo_description || article.excerpt || undefined;
  const [related, contact] = await Promise.all([
    getRelatedArticles(article.slug, 3),
    getContactSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: article.title,
        description,
        datePublished: article.published_at,
        dateModified: article.updated_at,
        inLanguage: site.language || "id",
        author: article.author
          ? { "@type": "Person", name: article.author }
          : undefined,
        publisher: { "@type": "Organization", name: site.site_name },
        keywords: article.keywords?.join(", "),
        wordCount: article.word_count ?? undefined,
        timeRequired: article.reading_time_minutes
          ? `PT${article.reading_time_minutes}M`
          : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: baseUrl() },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl()}/blog` },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl()}#website`,
        name: site.site_name,
        url: baseUrl(),
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="hover:text-accent">
              Beranda
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-accent">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{article.title}</li>
        </ol>
      </nav>

      <header className="mb-8 border-b border-line pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <time dateTime={article.published_at ?? undefined}>
            {formatDate(article.published_at)}
          </time>
          {article.reading_time_minutes ? (
            <span>· {article.reading_time_minutes} menit baca</span>
          ) : null}
          {article.word_count ? <span>· {article.word_count} kata</span> : null}
          {article.author ? <span>· {article.author}</span> : null}
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

      <article>
        <Markdown content={article.content_md ?? ""} />
      </article>

      {related.length > 0 ? (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">
            Artikel terkait
          </h2>
          <div className="flex flex-col gap-6">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      ) : null}

      <WhatsAppChatButton
        number={contact.whatsapp_number}
        message={contact.whatsapp_message}
        slug={article.slug}
        label="Tanya via WhatsApp"
      />
    </div>
  );
}
