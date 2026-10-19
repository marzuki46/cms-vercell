import Link from "next/link";
import ArticleCard from "@/components/article-card";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { env } from "@/lib/env";
import {
  getPublishedArticles,
  getPublishedCount,
  getContactSettings,
  getSiteSettings,
} from "@/lib/content";

export const revalidate = 300;

export default async function Home() {
  const [site, total, articles, contact] = await Promise.all([
    getSiteSettings(),
    getPublishedCount(),
    getPublishedArticles(9),
    getContactSettings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5">
      <section className="border-b border-line py-16 sm:py-20">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
          Blog
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Wawasan dan panduan terbaru dari {site.site_name}.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
          Artikel panjang yang ditulis berbasis riset kata kunci, dirapikan oleh
          editor, lalu diterbitkan dengan optimasi SEO lengkap — sitemap,
          metadata, dan structured data otomatis.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Jelajahi blog
          </Link>
          <WhatsAppChatButton
            variant="inline"
            number={contact.whatsapp_number}
            message={contact.whatsapp_message}
            label="Konsultasi via WhatsApp"
          />
        </div>
        <dl className="mt-10 flex gap-8 text-sm">
          <div>
            <dt className="text-muted">Artikel terbit</dt>
            <dd className="text-2xl font-semibold">{total}</dd>
          </div>
          <div>
            <dt className="text-muted">Format</dt>
            <dd className="text-2xl font-semibold">Long-form</dd>
          </div>
          <div>
            <dt className="text-muted">Update</dt>
            <dd className="text-2xl font-semibold">Otomatis</dd>
          </div>
        </dl>
      </section>

      <section className="py-14">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": `${env.siteUrl || "http://localhost:3000"}#website`,
                url: env.siteUrl || "http://localhost:3000",
                name: site.site_name,
                description: `Artikel, panduan, dan wawasan terbaru dari ${site.site_name}.`,
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${env.siteUrl || "http://localhost:3000"}/blog?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "Organization",
                "@id": `${env.siteUrl || "http://localhost:3000"}#organization`,
                name: site.site_name,
                url: env.siteUrl || "http://localhost:3000",
              },
            ],
          }}
        />
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Artikel terbaru
          </h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-accent hover:underline"
          >
            Lihat semua →
          </Link>
        </div>

        {articles.length === 0 ? (
          <p className="text-sm text-muted">
            Belum ada artikel yang diterbitkan. Silakan kembali lagi nanti untuk membaca pembaruan wawasan terbaru kami.
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
