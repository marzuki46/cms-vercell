import { revalidatePath, revalidateTag } from "next/cache";

const PUBLIC_PATHS = [
  "/",
  "/id",
  "/en",
  "/id/blog",
  "/en/blog",
  "/id/about",
  "/en/about",
  "/id/contact",
  "/en/contact",
  "/sitemap.xml",
  "/rss.xml",
  "/api/og",
];

/**
 * Flush every cache that feeds the public site.
 */
export function revalidateArticles(slug?: string) {
  safeTag("articles");
  safeTag("settings");
  for (const path of PUBLIC_PATHS) safePath(path);
  if (slug) {
    safePath(`/id/blog/${slug}`);
    safePath(`/en/blog/${slug}`);
  }
  safePath("/id/blog/page/2");
  safePath("/en/blog/page/2");
  try {
    revalidatePath("/", "layout");
  } catch {
    // outside a request scope
  }
}

export function revalidateSettings() {
  safeTag("settings");
  safeTag("articles");
  for (const path of PUBLIC_PATHS) safePath(path);
  try {
    revalidatePath("/", "layout");
  } catch {
    // outside a request scope
  }
}

/** Rebuild every blog pagination page after an insert/delete. */
export function revalidatePagination(totalPages: number) {
  safeTag("articles");
  for (const locale of ["id", "en"]) {
    for (let i = 2; i <= Math.max(totalPages, 2); i++) {
      safePath(`/${locale}/blog/page/${i}`);
    }
  }
}

function safeTag(tag: string) {
  try {
    // Call revalidateTag to immediately purge tag from data cache
    (revalidateTag as unknown as (t: string) => void)(tag);
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
