import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import JsonLd from "@/components/jsonld";
import {
  getAuthorBySlug,
  getArticlesByAuthor,
  getSiteSettings,
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
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };

  const base = env.siteUrl || "http://localhost:3000";
  const title = `${author.name} — ${author.role || "Author"}`;
  const description =
    author.bio ||
    `Profil penulis, keahlian, dan arsip artikel terbitan ${author.name}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${locale}/author/${slug}`,
      languages: {
        id: `${base}/id/author/${slug}`,
        en: `${base}/en/author/${slug}`,
        "x-default": `${base}/${DEFAULT_LOCALE}/author/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${base}/${locale}/author/${slug}`,
      images: author.avatar_url ? [{ url: author.avatar_url }] : undefined,
    },
  };
}

export default async function AuthorProfilePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const [author, site] = await Promise.all([
    getAuthorBySlug(slug),
    getSiteSettings(),
  ]);
  if (!author) notFound();

  const articles = await getArticlesByAuthor(author.name, 24, locale);
  const en = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";
  const url = `${base}/${locale}/author/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${url}#person`,
        name: author.name,
        jobTitle: author.role ?? undefined,
        description: author.bio ?? undefined,
        image: author.avatar_url ?? undefined,
        worksFor: {
          "@type": "Organization",
          name: site.site_name,
          url: base,
        },
        hasCredential: author.credentials?.map((c) => ({
          "@type": "EducationalOccupationalCredential",
          name: c,
        })),
        sameAs: author.social_links
          ? Object.values(author.social_links).filter(Boolean)
          : undefined,
      },
      {
        "@type": "ProfilePage",
        "@id": url,
        url,
        name: `${author.name} Profile`,
        mainEntity: { "@id": `${url}#person` },
        isPartOf: { "@id": `${base}#website` },
        inLanguage: en ? "en" : "id-ID",
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-16">
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
            <span className="text-muted">{en ? "Authors" : "Penulis"}</span>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{author.name}</li>
        </ol>
      </nav>

      <header className="mb-12 rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-fg shadow-sm">
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar_url}
                alt={author.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              author.name.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-0.5 text-xs font-semibold text-accent">
              <span>✓ Verified Author</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {author.name}
            </h1>
            {author.role ? (
              <p className="mt-1 text-sm font-medium text-accent">
                {author.role}
              </p>
            ) : null}
            {author.bio ? (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {author.bio}
              </p>
            ) : null}

            {author.credentials?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {author.credentials.map((cred) => (
                  <span
                    key={cred}
                    className="rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    🏅 {cred}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section>
        <div className="mb-8 border-b border-line pb-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {en ? `Articles by ${author.name}` : `Artikel oleh ${author.name}`}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {articles.length} {en ? "published posts" : "artikel terbit"}
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-line p-10 text-center text-sm text-muted">
            {en
              ? "No articles published by this author in this language yet."
              : "Belum ada artikel yang diterbitkan oleh penulis ini dalam bahasa ini."}
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
