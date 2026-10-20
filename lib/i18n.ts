export const SUPPORTED_LOCALES = ["id", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

const HTML_LANG: Record<Locale, string> = {
  id: "id-ID",
  en: "en",
};

const OG_LOCALE: Record<Locale, string> = {
  id: "id_ID",
  en: "en_US",
};

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale];
}

/** Prefixed URL, e.g. localize("/blog/x", "en") -> "/en/blog/x". */
export function localize(pathname: string, locale: Locale): string {
  const clean = pathname === "/" ? "" : pathname;
  return `/${locale}${clean}` || "/";
}

/** hreflang map for Next.js `alternates.languages`. */
export function languageAlternates(
  pathname: string,
  available: readonly Locale[] = SUPPORTED_LOCALES,
  siteUrl: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of available) {
    out[locale] = `${siteUrl}${localize(pathname, locale)}`;
  }
  out["x-default"] = `${siteUrl}${localize(pathname, DEFAULT_LOCALE)}`;
  return out;
}
