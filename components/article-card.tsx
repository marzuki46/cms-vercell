import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { ArticleListItem } from "@/types/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { getOptimizedArticleImage } from "@/lib/tech-images";

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  try {
    return format(new Date(value), "d MMM yyyy", { locale: idLocale });
  } catch {
    return "";
  }
}

function localeDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function ArticleCard({
  article,
  locale = DEFAULT_LOCALE,
}: {
  article: ArticleListItem;
  locale?: Locale;
}) {
  const en = locale === "en";
  const href = `/${locale}/blog/${article.slug}`;
  const imgMeta = getOptimizedArticleImage({
    title: article.title,
    keywords: article.keywords ?? undefined,
    coverImageUrl: article.cover_image_url,
    locale,
  });

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 transition-all duration-200 hover:border-accent/40 hover:shadow-md">
      {/* Cover Image with Title on Image */}
      <Link href={href} className="overflow-hidden rounded-xl bg-muted/20 block aspect-[16/9] relative">
        <img
          src={imgMeta.src}
          alt={imgMeta.alt}
          title={imgMeta.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <time dateTime={article.published_at ?? undefined}>
          {localeDate(article.published_at, locale)}
        </time>
        {article.reading_time_minutes ? (
          <span>
            · {article.reading_time_minutes} {en ? "min read" : "menit baca"}
          </span>
        ) : null}
        {article.author ? <span>· {article.author}</span> : null}
      </div>

      <h3 className="text-base sm:text-lg font-bold leading-snug tracking-tight text-foreground">
        <Link href={href} className="transition hover:text-accent">
          {article.title}
        </Link>
      </h3>

      {article.excerpt ? (
        <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted">{article.excerpt}</p>
      ) : null}

      <div className="mt-auto pt-2">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline"
        >
          <span>{en ? "Read more" : "Baca selengkapnya"}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
