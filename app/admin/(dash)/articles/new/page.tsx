"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Markdown from "@/components/markdown";
import { apiSend } from "@/lib/client-api";
import type { Article } from "@/types/db";

export default function NewArticleEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [author, setAuthor] = useState("Admin");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(status: "draft" | "published" = "draft") {
    if (!title.trim()) {
      setError("Judul pos wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await apiSend<{ article: Article }>("/api/admin/articles", "POST", {
        title: title.trim(),
        content_md: content,
        excerpt: excerpt.trim() || undefined,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDesc.trim() || undefined,
        author: author.trim() || "Admin",
        status,
      });

      router.push(`/admin/articles/${res.article.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#c3c4c7] shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#646970]">
            <Link href="/admin/articles" className="hover:text-[#2271b1]">
              ← Kembali ke Semua Pos
            </Link>
            <span>/</span>
            <span>Tambah Pos Baru</span>
          </div>
          <h1 className="text-xl font-bold text-[#1d2327] mt-1">Tambah Pos Baru</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="px-4 py-2 text-sm font-medium border border-[#2271b1] text-[#2271b1] hover:bg-[#2271b1] hover:text-white rounded transition disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("published")}
            className="px-4 py-2 text-sm font-medium bg-[#2271b1] text-white hover:bg-[#135e96] rounded transition disabled:opacity-50 shadow-sm"
          >
            {saving ? "Menerbitkan…" : "Terbitkan (Publish)"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Editor & Content) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-lg border border-[#c3c4c7] shadow-sm flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#646970] mb-1">
                Judul Pos
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tambahkan judul artikel di sini..."
                className="w-full text-lg font-bold px-3 py-2 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#646970] mb-1">
                Isi Artikel (Markdown)
              </label>
              <textarea
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis artikel lengkap menggunakan Markdown...
# Contoh Heading 1
## Contoh Heading 2
Paragraf artikel..."
                className="w-full font-mono text-sm px-3 py-2 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white p-5 rounded-lg border border-[#c3c4c7] shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#646970] mb-3">
              Pratinjau Langsung
            </h3>
            <div className="min-h-[120px] max-h-[400px] overflow-auto p-4 bg-[#f6f7f7] border border-[#dcdcde] rounded">
              {content ? (
                <Markdown content={content} />
              ) : (
                <span className="text-sm text-gray-400 italic">
                  Belum ada isi konten untuk ditampilkan...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar (Settings & SEO) */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-lg border border-[#c3c4c7] shadow-sm flex flex-col gap-3">
            <h2 className="text-sm font-bold text-[#1d2327] border-b border-[#dcdcde] pb-2">
              Metadata & Penulis
            </h2>

            <div>
              <label className="block text-xs text-[#646970] mb-1">Nama Penulis</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#646970] mb-1">Ringkasan (Excerpt)</label>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Deskripsi singkat konten..."
                className="w-full text-sm px-2.5 py-1.5 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1]"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-[#c3c4c7] shadow-sm flex flex-col gap-3">
            <h2 className="text-sm font-bold text-[#1d2327] border-b border-[#dcdcde] pb-2">
              Optimasi SEO (Google)
            </h2>

            <div>
              <label className="block text-xs text-[#646970] mb-1">SEO Title Tag</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Judul yang tampil di Google..."
                className="w-full text-sm px-2.5 py-1.5 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#646970] mb-1">Meta Description</label>
              <textarea
                rows={3}
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                placeholder="Deskripsi meta 120-155 karakter..."
                className="w-full text-sm px-2.5 py-1.5 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
