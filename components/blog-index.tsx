import Link from "next/link";
import ArticleCard from "@/components/article-card";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import {
  getPublishedArticles,
  getPublishedCount,
  getContactSettings,
} from "@/lib/content";

export const BLOG_PAGE_SIZE = 10;

export default async function BlogIndex({ page }: { page: number }) {
  const [total, contact] = await Promise.all([
    getPublishedCount(),
    getContactSettings(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const offset = (page - 1) * BLOG_PAGE_SIZE;
  const articles = await getPublishedArticles(BLOG_PAGE_SIZE, offset);

  const pageHref = (n: number) => (n <= 1 ? "/blog" : `/blog/page/${n}`);
  const numbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <header className="mb-10 border-b border-line pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-sm text-muted">
          {total} artikel diterbitkan.
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada artikel yang diterbitkan. Masuk ke{" "}
          <Link href="/admin" className="text-accent hover:underline">
            admin
          </Link>{" "}
          untuk menjalankan brainstorm dan generate pertama.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Navigasi halaman"
          className="mt-10 flex flex-wrap items-center gap-2 text-sm"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-md border border-line px-3 py-1.5 hover:border-accent hover:text-accent"
            >
              ← Sebelumnya
            </Link>
          ) : null}
          {numbers.map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              aria-current={n === page ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 ${
                n === page
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line hover:border-accent hover:text-accent"
              }`}
            >
              {n}
            </Link>
          ))}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-md border border-line px-3 py-1.5 hover:border-accent hover:text-accent"
            >
              Berikutnya →
            </Link>
          ) : null}
        </nav>
      ) : null}

      <WhatsAppChatButton
        number={contact.whatsapp_number}
        message={contact.whatsapp_message}
      />
    </div>
  );
}
