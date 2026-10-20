import slugify from "slugify";

const STOPWORDS = new Set([
  "dan", "atau", "di", "ke", "dari", "pada", "untuk", "dengan", "adalah", "ini", "itu",
  "yang", "juga", "bisa", "agar", "akan", "tentang", "oleh", "sebagai", "saat", "serta",
  "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are",
]);

/**
 * Buat slug URL ringkas, bersih, dan fokus pada kata kunci utama (SEO Best Practice).
 * - Menghapus stop words jika judul terlalu panjang.
 * - Membatasi maksimal 4-6 kata inti atau maksimal ~50 karakter.
 */
export function toSlug(input: string, maxWords = 5): string {
  if (!input) return `post-${Date.now().toString(36)}`;

  // Bersihkan karakter aneh sebelum slugify
  const rawWords = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (rawWords.length === 0) return `post-${Date.now().toString(36)}`;

  // Jika kata cukup banyak, hilangkan stop words agar URL padat kata kunci
  let filtered = rawWords;
  if (rawWords.length > 3) {
    const withoutStops = rawWords.filter((w) => !STOPWORDS.has(w));
    if (withoutStops.length >= 2) {
      filtered = withoutStops;
    }
  }

  // Batasi maksimal jumlah kata
  const limitedWords = filtered.slice(0, maxWords).join(" ");
  let slug = slugify(limitedWords, { lower: true, strict: true, trim: true });

  // Batasi panjang maksimal 55 karakter (potong rapi di batas strip)
  if (slug.length > 55) {
    const cut = slug.slice(0, 55);
    const lastDash = cut.lastIndexOf("-");
    slug = lastDash > 15 ? cut.slice(0, lastDash) : cut;
  }

  return slug || `post-${Date.now().toString(36)}`;
}

/** Append a numeric suffix when a slug already exists. */
export function withSuffix(slug: string, n: number): string {
  return n <= 1 ? slug : `${slug}-${n}`;
}
