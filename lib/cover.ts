/**
 * Helper to generate consistent dynamic cover image URLs with title and topic.
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
    return coverImageUrl.trim();
  }

  const params = new URLSearchParams();
  if (title) params.set("title", title.slice(0, 110));
  if (topic) params.set("topic", topic.slice(0, 40));
  if (siteName) params.set("site", siteName.slice(0, 50));

  return `/api/cover?${params.toString()}`;
}
