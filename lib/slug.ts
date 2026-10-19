import slugify from "slugify";

/** Turn an arbitrary title into a URL-safe slug. */
export function toSlug(input: string): string {
  const base = slugify(input, { lower: true, strict: true, trim: true });
  return base || `post-${Date.now().toString(36)}`;
}

/** Append a numeric suffix when a slug already exists. */
export function withSuffix(slug: string, n: number): string {
  return n <= 1 ? slug : `${slug}-${n}`;
}
