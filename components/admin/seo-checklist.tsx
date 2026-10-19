"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { auditSeo, seoScore } from "@/lib/article-seo";

/** Inline on-page SEO audit shown next to the editor. */
export default function SeoChecklist({
  title,
  seoTitle,
  seoDescription,
  excerpt,
  content,
}: {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  excerpt: string | null;
  content: string;
}) {
  const [open, setOpen] = useState(true);

  const checks = useMemo(
    () => auditSeo({ title, seoTitle, seoDescription, excerpt, content }),
    [title, seoTitle, seoDescription, excerpt, content],
  );
  const score = seoScore(checks);
  const tone =
    score >= 80
      ? "text-[#008a20] bg-[#edfaef] border-[#008a20]"
      : score >= 50
        ? "text-[#996800] bg-[#fcf9e8] border-[#dba617]"
        : "text-[#d63638] bg-[#fcf0f1] border-[#d63638]";

  return (
    <div className="rounded-lg border border-[#c3c4c7] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 border-b border-[#dcdcde] px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-[#1d2327]">On-Page SEO Check</span>
        <span className={`rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>
          {score}/100
        </span>
      </button>

      {open ? (
        <ul className="divide-y divide-[#f0f0f1]">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5 px-4 py-2.5">
              <span
                aria-hidden="true"
                className={`mt-0.5 text-sm font-bold ${
                  c.ok ? "text-[#008a20]" : "text-[#d63638]"
                }`}
              >
                {c.ok ? "✓" : "✕"}
              </span>
              <span className="flex-1 text-xs text-[#3c434a]">
                {c.label}
                <span className="block text-[11px] text-[#8c8f94]">{c.hint}</span>
              </span>
            </li>
          ))}
          <li className="px-4 py-3">
            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-[#2271b1] hover:underline"
            >
              Atur niche & brand voice agar AI menulis lebih relevan →
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
