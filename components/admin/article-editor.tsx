"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import VisualHtmlEditor from "@/components/admin/visual-html-editor";
import SeoChecklist from "@/components/admin/seo-checklist";
import { apiGet, apiSend } from "@/lib/client-api";
import { getCoverImageUrl } from "@/lib/cover";
import type { Article } from "@/types/db";

export default function ArticleEditor({ id }: { id: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingEn, setGeneratingEn] = useState(false);
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
        cover_image_url: article.cover_image_url ?? null,
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

  async function handleDelete() {
    if (!article || deleting) return;
    const ok = window.confirm(
      `Apakah Anda yakin ingin menghapus artikel "${article.title}"?\nTindakan ini permanen dan tidak dapat dibatalkan.`,
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await apiSend(`/api/admin/articles/${article.id}`, "DELETE");
      router.push("/admin/articles");
    } catch (err) {
      setError(`Gagal menghapus: ${(err as Error).message}`);
      setDeleting(false);
    }
  }

  async function handleGenerateEn() {
    if (!article) return;
    setGeneratingEn(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiSend<{ success: boolean; result: any }>(
        "/api/admin/generate-en",
        "POST",
        {
          idTitle: article.title,
          idContent: article.content_md,
          idExcerpt: article.excerpt,
          idKeywords: article.keywords,
        },
      );
      if (res.result) {
        const created = await apiSend<{ article: Article }>("/api/admin/articles", "POST", {
          title: res.result.title,
          slug: res.result.slug,
          content_md: res.result.content_md,
          excerpt: res.result.excerpt,
          seo_title: res.result.seo_title,
          seo_description: res.result.seo_description,
          language: "en",
          status: "draft",
          author: article.author || "Admin",
          translation_of: article.id,
        });
        setNotice("✓ Versi English berhasil dibuat sebagai Draft! Mengalihkan ke editor artikel EN...");
        router.push(`/admin/articles/${created.article.id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingEn(false);
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
          {article.language !== "en" && (
            <button
              type="button"
              onClick={handleGenerateEn}
              disabled={generatingEn || saving}
              className="rounded-md border border-[#2271b1] text-[#2271b1] hover:bg-[#2271b1] hover:text-white px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {generatingEn ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  <span>Menerjemahkan ke EN…</span>
                </>
              ) : (
                <>
                  <span>🌐</span>
                  <span>Buat Versi English (EN)</span>
                </>
              )}
            </button>
          )}
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
                disabled={saving || deleting}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-60"
              >
                Tarik ke draft
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-[#d63638] hover:bg-red-100 transition disabled:opacity-60 flex items-center gap-1"
            title="Hapus permanen artikel ini"
          >
            {deleting ? "Menghapus…" : "🗑️ Hapus"}
          </button>
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

        {/* Dynamic Featured Image Box */}
        <div className="rounded-lg border border-[#dcdcde] bg-[#f8fafc] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
              🖼️ Gambar Utama Konten (Auto-Cover WebP)
            </span>
            <span className="text-[11px] text-[#008a20] font-semibold bg-[#edfaef] px-2 py-0.5 rounded">
              ✓ Alt, Title &amp; Deskripsi Otomatis Sesuai Judul
            </span>
          </div>

          <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-4 items-center">
            <div className="aspect-[16/9] rounded-lg overflow-hidden border border-[#c3c4c7] bg-slate-900 shadow-inner">
              <img
                src={getCoverImageUrl({
                  title: article.title,
                  topic: article.keywords?.[0],
                  coverImageUrl: article.cover_image_url,
                })}
                alt={article.title}
                title={article.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-2 text-xs text-[#50575e]">
              <p>
                Visual banner di atas otomatis di-generate dengan judul artikel dan topik. Saat diakses di web, Next.js otomatis menyajikan dalam format <strong>WebP</strong> berkecepatan tinggi.
              </p>
              <label className="flex flex-col gap-1 mt-1">
                <span className="font-semibold text-[#1d2327]">URL Gambar Kustom (Opsional Override):</span>
                <input
                  value={article.cover_image_url ?? ""}
                  onChange={(e) => update("cover_image_url", e.target.value || null)}
                  placeholder="Kosongkan untuk memakai gambar banner otomatis bawaan"
                  className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-2.5 py-1.5 text-xs outline-none focus:border-[#2271b1]"
                />
              </label>
            </div>
          </div>
        </div>
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
