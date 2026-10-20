import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingId } from "@/lib/article-seo";

/**
 * Markdown renderer with stable heading anchors so the table of contents can
 * deep-link into the article (also improves crawlability of sub-sections).
 * Strictly guarantees that exactly ONE <h1> exists per page by remapping any
 * markdown <h1> (# Heading) into an <h2> (or dropping leading duplicate title).
 */
export default function Markdown({ content }: { content: string }) {
  // Strip duplicate leading markdown H1 if present, because page <header> already renders the canonical <h1>
  const cleanContent = (content || "").replace(/^#\s+[^\n]+(?:\r?\n|$)/, "").trim();

  return (
    <div className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          // Remap any markdown # heading to h2 to preserve strict single H1 per page for SEO
          h1: ({ children }) => <h2 id={headingId(String(children))}>{children}</h2>,
          h2: ({ children }) => <h2 id={headingId(String(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(String(children))}>{children}</h3>,
          h4: ({ children }) => <h4 id={headingId(String(children))}>{children}</h4>,
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            if (external) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                  {children}
                </a>
              );
            }
            return <a href={href}>{children}</a>;
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src ?? ""} alt={alt ?? ""} loading="lazy" decoding="async" />
          ),
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
