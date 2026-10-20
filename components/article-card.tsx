import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { ArticleListItem } from "@/types/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

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

  return (
    <article className="flex flex-col gap-2 border-b border-line pb-6">
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

      <h3 className="text-lg font-semibold leading-snug tracking-tight">
        <Link href={href} className="hover:text-accent">
          {article.title}
        </Link>
      </h3>

      {article.excerpt ? (
        <p className="text-sm leading-relaxed text-muted">{article.excerpt}</p>
      ) : null}

      <Link
        href={href}
        className="text-sm font-medium text-accent hover:underline"
      >
        {en ? "Read more →" : "Baca selengkapnya →"}
      </Link>
    </article>
  );
}
