/** Approximate word count for a Markdown string. */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

/** Reading time in minutes (rounded up, 200 wpm). */
export function readingTimeMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** Normalise a title for loose dedupe comparison. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
