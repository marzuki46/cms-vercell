export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Strip inline markdown formatting from heading text. */
function clean(text: string) {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable, URL-safe anchor id (matches the heading renderer). */
export function headingId(text: string): string {
  const base = clean(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || "section";
}

function uniqueId(id: string, seen: Map<string, number>) {
  const count = seen.get(id) ?? 0;
  seen.set(id, count + 1);
  return count === 0 ? id : `${id}-${count}`;
}

/** Extract H2/H3 headings from Markdown for the table of contents. */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.*\S)\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const text = clean(match[2]);
    if (!text) continue;

    items.push({ id: uniqueId(headingId(text), seen), text, level });
  }

  return items;
}

/** Plain-text preview used for meta description fallbacks. */
export function plainText(markdown: string, limit = 200): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/\s+\S*$/, "")}…`;
}

export interface SeoCheck {
  label: string;
  ok: boolean;
  hint: string;
}

/** Lightweight on-page audit surfaced in the admin editor. */
export function auditSeo(input: {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  excerpt: string | null;
  content: string;
}): SeoCheck[] {
  const metaTitle = (input.seoTitle || input.title).trim();
  const metaDesc = (input.seoDescription || input.excerpt || "").trim();
  const words = input.content.trim().split(/\s+/).filter(Boolean).length;
  const headings = extractToc(input.content);
  const h2 = headings.filter((h) => h.level === 2).length;
  const links = (input.content.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;

  return [
    {
      label: "SEO title 30–60 karakter",
      ok: metaTitle.length >= 30 && metaTitle.length <= 60,
      hint: `${metaTitle.length} karakter`,
    },
    {
      label: "Meta description 120–155 karakter",
      ok: metaDesc.length >= 120 && metaDesc.length <= 155,
      hint: `${metaDesc.length} karakter`,
    },
    {
      label: "Artikel minimal 600 kata",
      ok: words >= 600,
      hint: `${words} kata`,
    },
    {
      label: "Struktur minimal 3 sub-judul H2",
      ok: h2 >= 3,
      hint: `${h2} sub-judul`,
    },
    {
      label: "Internal link ke artikel lain",
      ok: links >= 2,
      hint: `${links} tautan`,
    },
  ];
}

export function seoScore(checks: SeoCheck[]): number {
  if (checks.length === 0) return 0;
  const passed = checks.filter((c) => c.ok).length;
  return Math.round((passed / checks.length) * 100);
}
