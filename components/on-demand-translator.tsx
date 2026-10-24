"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/markdown";

interface Props {
  sourceArticle: {
    id: string;
    title: string;
    excerpt?: string | null;
    content_md?: string | null;
    slug: string;
  };
  initialExcerpt?: string;
}

export default function OnDemandTranslator({ sourceArticle, initialExcerpt }: Props) {
  const [status, setStatus] = useState<"translating" | "ready" | "error">("translating");
  const [translatedTitle, setTranslatedTitle] = useState(sourceArticle.title);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract first paragraph for instant preview
  const firstParagraph =
    initialExcerpt ||
    sourceArticle.excerpt ||
    (sourceArticle.content_md
      ? sourceArticle.content_md
          .split(/\n\s*\n/)
          .map((p) => p.replace(/^#+\s+/, "").trim())
          .find((p) => p.length > 30)
      : null) ||
    "Preparing translated article preview...";

  useEffect(() => {
    let cancelled = false;

    async function triggerTranslation() {
      try {
        const res = await fetch("/api/articles/translate-on-demand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: sourceArticle.id }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (data.ok && data.englishArticle) {
          const en = data.englishArticle;
          if (en.title) setTranslatedTitle(en.title);
          if (en.content_md) setFullContent(en.content_md);
          setStatus("ready");

          // Update canonical browser URL to new English slug without full page refresh
          if (en.slug && window.location.pathname.includes("/en/blog/")) {
            const newPath = `/en/blog/${en.slug}`;
            if (window.location.pathname !== newPath) {
              window.history.replaceState(null, "", newPath);
            }
          }

          // Trigger header alternate update
          window.dispatchEvent(new Event("cms:alternate-updated"));
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Gagal menerjemahkan artikel.");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage((err as Error).message);
        }
      }
    }

    triggerTranslation();

    return () => {
      cancelled = true;
    };
  }, [sourceArticle.id, sourceArticle.slug]);

  if (status === "ready" && fullContent) {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>✓ English translation ready &amp; saved</span>
        </div>
        <Markdown content={fullContent} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Real-time Translation Banner */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="text-xl animate-spin" aria-hidden="true">
            ⚙️
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground">
              Translating Article to Native English...
            </h2>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Displaying the first paragraph below while AI completes the full translation with technical code blocks and SEO structure.
            </p>
            {/* Progress Bar */}
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full w-2/3 rounded-full bg-accent animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Instant First Paragraph Preview (No blank loading screen) */}
      <div className="prose max-w-none text-foreground text-base sm:text-lg leading-relaxed border-l-2 border-accent/40 pl-4 italic">
        <p>{firstParagraph}</p>
      </div>

      {/* Pulsing Skeletons for Remaining Paragraphs */}
      {status === "translating" ? (
        <div className="flex flex-col gap-4 mt-2 opacity-60">
          <div className="h-4 w-3/4 rounded bg-line animate-pulse" />
          <div className="h-4 w-full rounded bg-line animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-line animate-pulse" />
          <div className="h-28 w-full rounded-xl bg-line/60 animate-pulse mt-3" />
          <div className="h-4 w-4/5 rounded bg-line animate-pulse mt-2" />
          <div className="h-4 w-full rounded bg-line animate-pulse" />
        </div>
      ) : null}

      {/* Error state */}
      {status === "error" ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold">Translasi otomatis tertunda: {errorMessage}</p>
          <p className="mt-1">Menampilkan konten asli bahasa Indonesia di bawah.</p>
          {sourceArticle.content_md ? (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <Markdown content={sourceArticle.content_md} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
