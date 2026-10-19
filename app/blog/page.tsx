import Link from "next/link";
import ArticleCard from "@/components/article-card";
import { getPublishedArticles, getPublishedCount, getSiteSettings } from "@/lib/content";

export const revalidate = 300;

export default async function BlogIndexPage() {
  const [site, articles, total] = await Promise.all([
    getSiteSettings(),
    getPublishedArticles(12),
    getPublishedCount(),
  ]);

  const isEn = site.language === "en";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-accent">
              {isEn ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Blog</li>
        </ol>
      </nav>

      <div className="border-b border-line pb-8 mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          {isEn ? "All Articles" : "Semua Artikel"}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {isEn
            ? `Browse our comprehensive archive of ${total} guides, articles, and insights.`
            : `Arsip lengkap ${total} artikel, panduan, dan ulasan terverifikasi.`}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-line p-12 text-center text-muted">
          {isEn
            ? "No articles have been published yet."
            : "Belum ada artikel yang diterbitkan."}
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
