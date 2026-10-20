"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VisualHtmlEditor from "@/components/admin/visual-html-editor";
import SeoChecklist from "@/components/admin/seo-checklist";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Article } from "@/types/db";

export default function ArticleEditor({ id }: { id: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiGet<{ article: Article }>(
          `/api/admin/articles/${id}`,
        );
        if (active) {
          setArticle(res.article);
          setError(null);
        }
      } catch (err) {
        if (active) setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  function update<K extends keyof Article>(key: K, value: Article[K]) {
    setArticle((a) => (a ? { ...a, [key]: value } : a));
  }

  async function save(status?: Article["status"]) {
    if (!article) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body: Record<string, unknown> = {
        title: article.title,
        excerpt: article.excerpt ?? "",
        seo_title: article.seo_title ?? "",
        seo_description: article.seo_description ?? "",
        author: article.author ?? "",
        content_md: article.content_md ?? "",
        language: article.language ?? "id",
      };
      if (status) body.status = status;
      const res = await apiSend<{ article: Article }>(
        `/api/admin/articles/${id}`,
        "PATCH",
        body,
      );
      setArticle(res.article);
      const liveUrl = `/${res.article.language ?? "id"}/blog/${res.article.slug}`;
      setNotice(
        status === "published"
          ? "✓ Dipublikasikan. Artikel sudah langsung tampil di halaman depan."
          : status
            ? `Disimpan & status: ${status}.`
            : "Perubahan disimpan.",
      );
      setLiveUrl(liveUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Memuat…</p>;
  if (!article)
    return (
      <p className="text-sm text-warn">{error ?? "Artikel tidak ditemukan."}</p>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/articles"
            className="text-sm text-muted hover:text-accent"
          >
            ← Artikel
          </Link>
          <p className="mt-1 text-xs text-muted">
            status: <strong>{article.status}</strong>
            {article.word_count ? ` · ${article.word_count} kata` : ""}
            {` · ${(article.language ?? "id").toUpperCase()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
          {article.status !== "published" ? (
            <button
              type="button"
              onClick={() => save("published")}
              disabled={saving}
              className="rounded-md bg-[#008a20] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007017] disabled:opacity-60"
            >
              Simpan &amp; Publish
            </button>
          ) : (
            <>
              <Link
                href={liveUrl ?? `/${article.language ?? "id"}/blog/${article.slug}`}
                target="_blank"
                className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
              >
                Lihat publik ↗
              </Link>
              <button
                type="button"
                onClick={() => save("draft")}
                disabled={saving}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-60"
              >
                Tarik ke draft
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#008a20]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-[#c3c4c7] bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-bold text-[#1d2327]">Judul Pos</span>
          <input
            value={article.title}
            onChange={(e) => update("title", e.target.value)}
            className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-bold text-[#1d2327]">SEO Title Tag</span>
            <input
              value={article.seo_title ?? ""}
              onChange={(e) => update("seo_title", e.target.value)}
              className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-bold text-[#1d2327]">Penulis</span>
            <input
              value={article.author ?? ""}
              onChange={(e) => update("author", e.target.value)}
              className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-bold text-[#1d2327]">Bahasa Artikel</span>
            <select
              value={article.language ?? "id"}
              onChange={(e) =>
                update("language", e.target.value as "id" | "en")
              }
              className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
            >
              <option value="id">Bahasa Indonesia → /id/blog/…</option>
              <option value="en">English → /en/blog/…</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-bold text-[#1d2327]">Slug URL</span>
            <input
              value={article.slug}
              readOnly
              className="rounded border border-[#dcdcde] bg-[#f6f7f7] text-[#646970] px-3 py-2 font-mono text-xs outline-none"
            />
            <span className="text-xs text-[#646970]">
              Diubah otomatis dari judul. Perpindahan slug lama dicatat sebagai
              redirect 301.
            </span>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-bold text-[#1d2327]">Meta Description (SEO)</span>
          <textarea
            rows={2}
            value={article.seo_description ?? ""}
            onChange={(e) => update("seo_description", e.target.value)}
            className="resize-y rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-bold text-[#1d2327]">Ringkasan (Excerpt)</span>
          <textarea
            rows={2}
            value={article.excerpt ?? ""}
            onChange={(e) => update("excerpt", e.target.value)}
            className="resize-y rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-bold text-[#1d2327]">Isi Konten Artikel</span>
            <VisualHtmlEditor
              value={article.content_md ?? ""}
              onChange={(md) => update("content_md", md)}
            />
          </div>
        </div>
        <div className="w-full">
          <SeoChecklist
            title={article.title}
            seoTitle={article.seo_title}
            seoDescription={article.seo_description}
            excerpt={article.excerpt}
            content={article.content_md ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
