import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingId } from "@/lib/article-seo";

/**
 * Markdown renderer with stable heading anchors so the table of contents can
 * deep-link into the article (also improves crawlability of sub-sections).
 */
export default function Markdown({ content }: { content: string }) {
  return (
    <div className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
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
