import Link from "next/link";
import type { Author } from "@/types/db";
import type { Locale } from "@/lib/i18n";

interface Props {
  author: Author;
  locale: Locale;
  customTitle?: string | null;
  className?: string;
}

export default function AuthorBox({
  author,
  locale,
  customTitle,
  className = "",
}: Props) {
  const en = locale === "en";
  const title =
    customTitle ||
    (en ? "Written & Verified By" : "Ditulis & Diverifikasi Oleh");

  const authorHref = `/${locale}/author/${author.slug || "admin"}`;

  return (
    <aside
      aria-label={title}
      className={`rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-sm transition hover:border-accent/30 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {/* Avatar */}
        <Link
          href={authorHref}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-fg shadow-sm overflow-hidden transition hover:opacity-90 active:scale-95"
        >
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{author.name.charAt(0).toUpperCase()}</span>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              {title}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#008a20] bg-[#edfaef] px-2 py-0.5 rounded-full">
              ✓ Verified E-E-A-T
            </span>
          </div>

          <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground">
            <Link
              href={authorHref}
              className="hover:text-accent transition underline-offset-2 hover:underline"
            >
              {author.name}
            </Link>
          </h3>

          {author.role ? (
            <p className="text-xs font-semibold text-muted">{author.role}</p>
          ) : null}

          {author.bio ? (
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted/90 line-clamp-3">
              {author.bio}
            </p>
          ) : null}

          {/* Credentials Pills */}
          {author.credentials && author.credentials.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {author.credentials.map((cred) => (
                <span
                  key={cred}
                  className="rounded-md border border-line bg-muted/10 px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  🏅 {cred}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3">
            <Link
              href={authorHref}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
            >
              <span>{en ? "View author profile & articles" : "Lihat profil & arsip artikel penulis"}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
