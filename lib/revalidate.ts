import { revalidatePath, revalidateTag } from "next/cache";

const PUBLIC_PATHS = [
  "/",
  "/blog",
  "/blog/page/1",
  "/about",
  "/contact",
  "/sitemap.xml",
  "/rss.xml",
  "/api/og",
];

/**
 * Flush every cache that feeds the public site.
 *
 * `revalidatePath` alone is not enough: the public pages read through
 * `unstable_cache` (data cache), which survives path revalidation. Without
 * `revalidateTag("articles")` a freshly published post would stay invisible on
 * the homepage until the 300s data-cache window expired.
 */
export function revalidateArticles(slug?: string) {
  safeTag("articles");
  safeTag("settings");
  for (const path of PUBLIC_PATHS) safePath(path);
  if (slug) safePath(`/blog/${slug}`);
  safePath("/blog/page/2");
}

export function revalidateSettings() {
  safeTag("settings");
  safeTag("articles");
  for (const path of PUBLIC_PATHS) safePath(path);
}

/** Rebuild every blog pagination page after an insert/delete. */
export function revalidatePagination(totalPages: number) {
  safeTag("articles");
  for (let i = 2; i <= Math.max(totalPages, 2); i++) {
    safePath(`/blog/page/${i}`);
  }
}

function safeTag(tag: string) {
  try {
    revalidateTag(tag, "max");
  } catch {
    // outside a request scope (e.g. cron) — ignore
  }
}

function safePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // outside a request scope — ignore
  }
}
