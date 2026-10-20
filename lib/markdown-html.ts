/**
 * Convert Markdown to HTML for WYSIWYG editor consumption.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  // Normalize line endings
  let text = md.replace(/\r\n/g, "\n");

  // Protect code blocks first
  const codeBlocks: string[] = [];
  text = text.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, (_, lang, code) => {
    const escaped = escapeHtml(code.trim());
    codeBlocks.push(`<pre><code class="language-${lang || "text"}">${escaped}</code></pre>`);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // Images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:4px;" />');

  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Headings
  text = text.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
  text = text.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
  text = text.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
  text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold & Italic
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Blockquotes
  text = text.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  // Horizontal rule
  text = text.replace(/^---$/gim, "<hr />");

  // Lists: Unordered
  text = text.replace(/^\s*[-*+]\s+(.*$)/gim, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>(\n|$))+/g, "<ul>$&</ul>");

  // Lists: Ordered
  text = text.replace(/^\s*\d+\.\s+(.*$)/gim, "<oli>$1</oli>");
  text = text.replace(/(<oli>.*<\/oli>(\n|$))+/g, (match) => {
    return "<ol>" + match.replace(/<oli>/g, "<li>").replace(/<\/oli>/g, "</li>") + "</ol>";
  });

  // Paragraphs: split by double newlines
  const paragraphs = text.split(/\n\s*\n/);
  const parsed = paragraphs
    .map((para) => {
      para = para.trim();
      if (!para) return "";
      // If block starts with a tag that doesn't need <p>, keep it
      if (
        /^<(h[1-6]|ul|ol|blockquote|pre|hr|div|table|img)/i.test(para) ||
        para.startsWith("__CODEBLOCK_")
      ) {
        return para;
      }
      return `<p>${para.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  // Restore code blocks
  return parsed.replace(/__CODEBLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] || "");
}

/**
 * Convert HTML back to clean, well-formed Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  let md = html;

  // Normalize linebreaks
  md = md.replace(/\r\n/g, "\n");

  // Code blocks: <pre><code ...>...</code></pre>
  md = md.replace(/<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi, (_, lang, code) => {
    return `\n\`\`\`${lang || ""}\n${unescapeHtml(code.trim())}\n\`\`\`\n`;
  });

  // Inline code
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n");

  // Bold & Italic
  md = md.replace(/<strong><em>(.*?)<\/em><\/strong>/gi, "***$1***");
  md = md.replace(/<em><strong>(.*?)<\/strong><\/em>/gi, "***$1***");
  md = md.replace(/<b><i>(.*?)<\/i><\/b>/gi, "***$1***");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");

  // Links
  md = md.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Images
  md = md.replace(/<img\s+(?:[^>]*?\s+)?src="([^"]*)"(?:\s+alt="([^"]*)")?[^>]*\/?>/gi, "![$2]($1)");

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    return "\n" + inner.trim().split("\n").map((l: string) => `> ${l.trim()}`).join("\n") + "\n";
  });

  // Unordered Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
    return "\n" + items.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n").trim() + "\n";
  });

  // Ordered Lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
    let index = 1;
    const replaced = items.replace(/<li[^>]*>(.*?)<\/li>/gi, (_: string, item: string) => {
      return `${index++}. ${item}\n`;
    });
    return "\n" + replaced.trim() + "\n";
  });

  // Paragraphs & Breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  md = unescapeHtml(md);

  // Clean up excess newlines
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}
