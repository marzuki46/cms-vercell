import { matchTechImage } from "./tech-images";

/**
 * Helper to generate consistent dynamic cover image URLs with title and topic.
 * Falls back to high-quality compressed WebP tech photography when no custom cover is set.
 */
export function getCoverImageUrl({
  title,
  topic,
  coverImageUrl,
  siteName = "Portal",
}: {
  title: string;
  topic?: string | null;
  coverImageUrl?: string | null;
  siteName?: string;
}): string {
  if (coverImageUrl && coverImageUrl.trim().startsWith("http")) {
    let url = coverImageUrl.trim();
    if (url.includes("images.unsplash.com") && !url.includes("fm=webp")) {
      url += (url.includes("?") ? "&" : "?") + "fm=webp&q=80";
    }
    return url;
  }

  // Use curated high-performance WebP tech photography based on title/topic
  const matched = matchTechImage(title, topic ? [topic] : []);
  return matched.url;
}
