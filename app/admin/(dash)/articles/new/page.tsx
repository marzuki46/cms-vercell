"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import VisualHtmlEditor from "@/components/admin/visual-html-editor";
import AiContentStudio, { type GeneratedData } from "@/components/admin/ai-content-studio";
import { apiGet, apiSend } from "@/lib/client-api";
import { toSlug } from "@/lib/slug";
import type { Article } from "@/types/db";

export default function NewArticleEditor() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"write" | "ai_studio">("write");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [author, setAuthor] = useState("Admin");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Ambil nama penulis default dari Pengaturan Situs
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiGet<{ settings: { default_author?: string | null } }>(
          "/api/admin/settings",
        );
        if (active && res?.settings?.default_author) {
          setAuthor(res.settings.default_author);
        }
      } catch {
        // Safe fallback
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function handleAcceptAi(data: GeneratedData, lang: "id" | "en") {
    setTitle(data.title);
    setSlug(data.slug || toSlug(data.title, 5));
    setContent(data.content_md);
    setExcerpt(data.excerpt);
    setSeoTitle(data.seo_title);
    setSeoDesc(data.seo_description);
    setLanguage(lang);
    setActiveTab("write");
    setAiNotice(
      `✓ Konten hasil generate AI (${lang.toUpperCase()}) berhasil dimasukkan ke formulir! Anda bisa menyuntingnya lebih lanjut, menambahkan thumbnail, lalu menerbitkannya.`,
    );
  }

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
        slug: slug.trim() || toSlug(title.trim(), 5),
        content_md: content,
        excerpt: excerpt.trim() || undefined,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDesc.trim() || undefined,
        author: author.trim() || "Admin",
        language,
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
    <div className="flex flex-col gap-5">
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

      {/* Main Tab Switcher: Editor vs AI Content Studio */}
      <div className="flex items-center gap-2 border-b border-[#c3c4c7] bg-white px-4 pt-3 rounded-t-lg">
        <button
          type="button"
          onClick={() => setActiveTab("write")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === "write"
              ? "border-[#2271b1] text-[#2271b1]"
              : "border-transparent text-[#646970] hover:text-[#1d2327]"
          }`}
        >
          <span>✍️</span>
          <span>Editor Artikel (Visual Word &amp; HTML)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ai_studio")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === "ai_studio"
              ? "border-[#008a20] text-[#008a20]"
              : "border-transparent text-[#646970] hover:text-[#008a20]"
          }`}
        >
          <span>⚡</span>
          <span>Tool Generate AI &amp; Riset Entitas (ID &amp; EN)</span>
        </button>
      </div>

      {aiNotice ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#008a20] flex items-center justify-between">
          <span>{aiNotice}</span>
          <button
            type="button"
            onClick={() => setAiNotice(null)}
            className="text-xs text-gray-500 hover:text-black font-bold ml-2"
          >
            ✕
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}

      {/* Render AI Studio Tool or Standard Form */}
      {activeTab === "ai_studio" ? (
        <AiContentStudio
          onAccept={handleAcceptAi}
          onCancel={() => setActiveTab("write")}
        />
      ) : (
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
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug) setSlug(toSlug(e.target.value, 5));
                  }}
                  placeholder="Tambahkan judul artikel di sini..."
                  className="w-full text-lg font-bold px-3 py-2 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#646970]">
                    Isi Konten Artikel
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai_studio")}
                    className="text-xs font-bold text-[#2271b1] hover:underline flex items-center gap-1"
                  >
                    <span>⚡</span>
                    <span>Generate otomatis dari Topik / Paragraf</span>
                  </button>
                </div>
                <VisualHtmlEditor
                  value={content}
                  onChange={(val) => setContent(val)}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar (Settings & SEO) */}
          <div className="flex flex-col gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#c3c4c7] shadow-sm flex flex-col gap-3">
              <h2 className="text-sm font-bold text-[#1d2327] border-b border-[#dcdcde] pb-2">
                Metadata &amp; Penulis
              </h2>

              <div>
                <label className="block text-xs font-bold text-[#1d2327] mb-1">
                  Bahasa Artikel (Language)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "id" | "en")}
                  className="w-full text-sm px-2.5 py-1.5 border border-[#8c8f94] rounded focus:outline-none focus:border-[#2271b1] bg-white font-semibold"
                >
                  <option value="id">🇮🇩 Bahasa Indonesia (/id/blog/...)</option>
                  <option value="en">🇬🇧 English (/en/blog/...)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#646970] mb-1">
                  URL Slug (Ringkas &amp; Padat Keyword)
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 bg-[#f0f0f1] px-2 py-1.5 border border-r-0 border-[#8c8f94] rounded-l">
                    /{language}/blog/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(toSlug(e.target.value, 5))}
                    placeholder="slug-padat-keyword"
                    className="w-full text-xs font-mono px-2 py-1.5 border border-[#8c8f94] rounded-r focus:outline-none focus:border-[#2271b1]"
                  />
                </div>
                <p className="text-[10px] text-[#646970] mt-1">
                  Dibatasi otomatis 4-5 kata kunci inti tanpa kata hubung untuk performa SEO maksimal.
                </p>
              </div>

              <div>
                <label className="block text-xs text-[#646970] mb-1">
                  Nama Penulis (Default dari Pengaturan)
                </label>
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
      )}
    </div>
  );
}
