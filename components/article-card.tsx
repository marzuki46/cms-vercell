import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { ArticleListItem } from "@/types/db";

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  try {
    return format(new Date(value), "d MMM yyyy", { locale: id });
  } catch {
    return "";
  }
}

export default function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <article className="flex flex-col gap-2 border-b border-line pb-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <time dateTime={article.published_at ?? undefined}>
          {formatDate(article.published_at)}
        </time>
        {article.reading_time_minutes ? (
          <span>· {article.reading_time_minutes} menit baca</span>
        ) : null}
        {article.author ? <span>· {article.author}</span> : null}
      </div>
      <h3 className="text-lg font-semibold leading-snug tracking-tight">
        <Link href={`/blog/${article.slug}`} className="hover:text-accent">
          {article.title}
        </Link>
      </h3>
      {article.excerpt ? (
        <p className="text-sm leading-relaxed text-muted">{article.excerpt}</p>
      ) : null}
      <Link
        href={`/blog/${article.slug}`}
        className="text-sm font-medium text-accent hover:underline"
      >
        Baca selengkapnya →
      </Link>
    </article>
  );
}
