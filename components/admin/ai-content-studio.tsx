"use client";

import { useState, useEffect } from "react";
import Markdown from "@/components/markdown";
import { apiGet, apiSend } from "@/lib/client-api";
import { toSlug } from "@/lib/slug";

export interface GeneratedData {
  title: string;
  slug?: string;
  seo_title: string;
  seo_description: string;
  excerpt: string;
  keywords: string[];
  content_md: string;
  word_count: number;
}

interface Props {
  onAccept: (data: GeneratedData, language: "id" | "en") => void;
  onCancel: () => void;
}

const STORAGE_KEYWORD_PROMPT = "cms_custom_keyword_prompt";
const STORAGE_CONTENT_PROMPT = "cms_custom_content_prompt";
const STORAGE_CTA_TYPE = "cms_custom_cta_type";
const STORAGE_CTA_TEXT = "cms_custom_cta_text";
const STORAGE_CTA_TARGET = "cms_custom_cta_target";
const STORAGE_CTA_INSTRUCTION = "cms_custom_cta_instruction";

const DEFAULT_KEYWORD_PROMPT = `Ekstrak dan kembangkan kata kunci entitas SEO:
1. Target kata kunci utama (Primary Keyword)
2. 5-8 Entity keywords (LSI / semantic terms) yang relevan
3. Klasifikasi search intent pengunjung`;

const DEFAULT_CONTENT_PROMPT = `Tulis artikel SEO mendalam, faktual, dan komprehensif (minimal 800-1200 kata).
- Buat judul menarik (H1) yang mengundang klik
- Struktur konten rapi dengan Sub-heading (H2, H3)
- Sertakan poin-poin actionable, perbandingan, atau tips praktis
- Sisipkan Call To Action (CTA) secara natural dan terarah agar pembaca mengambil tindakan
- Bahasa mengalir, profesional, dan ramah pembaca
- Optimasi kaidah Google Helpful Content & E-E-A-T`;

const DEFAULT_CTA_INSTRUCTION = `Arahkan pembaca yang membutuhkan bantuan / konsultasi / promo khusus untuk menghubungi via WhatsApp atau klik tautan penawaran resmi. Berikan kalimat pengantar yang persuasif di tengah artikel dan kalimat penutup yang kuat di akhir artikel.`;

export default function AiContentStudio({ onAccept, onCancel }: Props) {
  const [topicOrParagraph, setTopicOrParagraph] = useState("");
  const [keywordPrompt, setKeywordPrompt] = useState(DEFAULT_KEYWORD_PROMPT);
  const [contentPrompt, setContentPrompt] = useState(DEFAULT_CONTENT_PROMPT);

  // CTA State
  const [ctaType, setCtaType] = useState<"whatsapp" | "link" | "custom" | "none">("whatsapp");
  const [ctaText, setCtaText] = useState("Hubungi Kami via WhatsApp");
  const [ctaTarget, setCtaTarget] = useState("");
  const [ctaInstruction, setCtaInstruction] = useState(DEFAULT_CTA_INSTRUCTION);

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translatingEn, setTranslatingEn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hasil generate ID dan EN
  const [idData, setIdData] = useState<GeneratedData | null>(null);
  const [enData, setEnData] = useState<GeneratedData | null>(null);
  const [viewLang, setViewLang] = useState<"id" | "en">("id");
  const [dualPublishSuccess, setDualPublishSuccess] = useState<string | null>(null);

  // Load saved preferences & settings from DB & LocalStorage
  useEffect(() => {
    try {
      const savedKw = localStorage.getItem(STORAGE_KEYWORD_PROMPT);
      if (savedKw) setKeywordPrompt(savedKw);
      const savedCt = localStorage.getItem(STORAGE_CONTENT_PROMPT);
      if (savedCt) setContentPrompt(savedCt);
      const savedCtaType = localStorage.getItem(STORAGE_CTA_TYPE);
      if (savedCtaType) setCtaType(savedCtaType as any);
      const savedCtaText = localStorage.getItem(STORAGE_CTA_TEXT);
      if (savedCtaText) setCtaText(savedCtaText);
      const savedCtaTarget = localStorage.getItem(STORAGE_CTA_TARGET);
      if (savedCtaTarget) setCtaTarget(savedCtaTarget);
      const savedCtaInstruction = localStorage.getItem(STORAGE_CTA_INSTRUCTION);
      if (savedCtaInstruction) setCtaInstruction(savedCtaInstruction);
    } catch {
      // Safe fallback
    }

    // Ambil default WhatsApp number dari Settings situs jika belum ada di localStorage
    (async () => {
      try {
        const res = await apiGet<{ settings: { whatsapp_number?: string | null } }>(
          "/api/admin/settings",
        );
        if (res?.settings?.whatsapp_number && !localStorage.getItem(STORAGE_CTA_TARGET)) {
          setCtaTarget(res.settings.whatsapp_number);
        }
      } catch {
        // Safe fallback
      }
    })();
  }, []);

  function savePrompts() {
    try {
      localStorage.setItem(STORAGE_KEYWORD_PROMPT, keywordPrompt);
      localStorage.setItem(STORAGE_CONTENT_PROMPT, contentPrompt);
      localStorage.setItem(STORAGE_CTA_TYPE, ctaType);
      localStorage.setItem(STORAGE_CTA_TEXT, ctaText);
      localStorage.setItem(STORAGE_CTA_TARGET, ctaTarget);
      localStorage.setItem(STORAGE_CTA_INSTRUCTION, ctaInstruction);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    } catch {
      // Ignore
    }
  }

  function resetPrompts() {
    if (confirm("Kembalikan template prompt & pengaturan CTA ke default bawaan?")) {
      setKeywordPrompt(DEFAULT_KEYWORD_PROMPT);
      setContentPrompt(DEFAULT_CONTENT_PROMPT);
      setCtaType("whatsapp");
      setCtaText("Hubungi Kami via WhatsApp");
      setCtaInstruction(DEFAULT_CTA_INSTRUCTION);
      try {
        localStorage.removeItem(STORAGE_KEYWORD_PROMPT);
        localStorage.removeItem(STORAGE_CONTENT_PROMPT);
        localStorage.removeItem(STORAGE_CTA_TYPE);
        localStorage.removeItem(STORAGE_CTA_TEXT);
        localStorage.removeItem(STORAGE_CTA_INSTRUCTION);
      } catch {
        // Ignore
      }
    }
  }

  async function handleGenerateId() {
    if (!topicOrParagraph.trim()) {
      setError("Masukkan topik artikel atau paragraf awal terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    setIdData(null);
    setEnData(null);
    setViewLang("id");
    setDualPublishSuccess(null);

    // Otomatis simpan preferensi prompt saat generate
    savePrompts();

    try {
      const res = await apiSend<{ success: boolean; result: GeneratedData }>(
        "/api/admin/generate-custom",
        "POST",
        {
          topicOrParagraph: topicOrParagraph.trim(),
          keywordPrompt: keywordPrompt.trim(),
          contentPrompt: contentPrompt.trim(),
          ctaType,
          ctaText: ctaText.trim(),
          ctaTarget: ctaTarget.trim(),
          ctaInstruction: ctaInstruction.trim(),
        },
      );

      if (res.result) {
        // Batasi slug ringkas padat kata kunci (max 5 kata)
        const generatedSlug = toSlug(res.result.title, 5);
        setIdData({
          ...res.result,
          slug: generatedSlug,
        });
      } else {
        throw new Error("Respon generator kosong.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateEn() {
    if (!idData) return;

    setTranslatingEn(true);
    setError(null);
    try {
      const res = await apiSend<{ success: boolean; result: GeneratedData }>(
        "/api/admin/generate-en",
        "POST",
        {
          idTitle: idData.title,
          idContent: idData.content_md,
          idExcerpt: idData.excerpt,
          idKeywords: idData.keywords,
          ctaText,
          ctaTarget,
        },
      );

      if (res.result) {
        setEnData(res.result);
        setViewLang("en");
      } else {
        throw new Error("Gagal menerima hasil terjemahan EN.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTranslatingEn(false);
    }
  }

  async function handlePublishIdOnly() {
    if (!idData) return;
    if (!confirm("Terbitkan artikel versi Indonesia (ID) sekarang? (Versi EN jika ada akan disimpan sebagai Draft)")) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Simpan dan terbitkan artikel ID
      const resId = await apiSend<{ article: { id: string; slug: string } }>("/api/admin/articles", "POST", {
        title: idData.title,
        slug: idData.slug || toSlug(idData.title, 5),
        content_md: idData.content_md,
        excerpt: idData.excerpt,
        seo_title: idData.seo_title,
        seo_description: idData.seo_description,
        language: "id",
        status: "published",
      });

      // 2. Jika ada versi EN, simpan sebagai DRAFT
      let hasEnDraft = false;
      if (enData) {
        await apiSend<{ article: { id: string; slug: string } }>("/api/admin/articles", "POST", {
          title: enData.title,
          slug: enData.slug || toSlug(enData.title, 5),
          content_md: enData.content_md,
          excerpt: enData.excerpt,
          seo_title: enData.seo_title,
          seo_description: enData.seo_description,
          language: "en",
          status: "draft",
        });
        hasEnDraft = true;
      }

      setDualPublishSuccess(
        hasEnDraft
          ? `✓ Sukses! Artikel Indonesia (ID) telah DITERBITKAN secara publik!\n🇮🇩 URL Tayang: /id/blog/${resId.article.slug}\n🇬🇧 Versi English tersimpan aman sebagai DRAFT di admin.`
          : `✓ Sukses! Artikel Indonesia (ID) telah DITERBITKAN secara publik!\n🇮🇩 URL Tayang: /id/blog/${resId.article.slug}`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishBoth() {
    if (!idData || !enData) return;
    if (!confirm("Terbitkan langsung kedua artikel (ID dan EN) sekarang?")) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Simpan artikel ID
      const resId = await apiSend<{ article: { id: string; slug: string } }>("/api/admin/articles", "POST", {
        title: idData.title,
        slug: idData.slug || toSlug(idData.title, 5),
        content_md: idData.content_md,
        excerpt: idData.excerpt,
        seo_title: idData.seo_title,
        seo_description: idData.seo_description,
        language: "id",
        status: "published",
      });

      // 2. Simpan artikel EN
      const resEn = await apiSend<{ article: { id: string; slug: string } }>("/api/admin/articles", "POST", {
        title: enData.title,
        slug: enData.slug || toSlug(enData.title, 5),
        content_md: enData.content_md,
        excerpt: enData.excerpt,
        seo_title: enData.seo_title,
        seo_description: enData.seo_description,
        language: "en",
        status: "published",
      });

      setDualPublishSuccess(
        `✓ Sukses! Kedua artikel berhasil diterbitkan!\n🇮🇩 ID: /id/blog/${resId.article.slug}\n🇬🇧 EN: /en/blog/${resEn.article.slug}`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const activeData = viewLang === "en" ? enData : idData;

  return (
    <div className="flex flex-col gap-5 bg-white p-4 sm:p-6 rounded-lg border border-[#c3c4c7] shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#dcdcde] gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1d2327] flex items-center gap-2">
            <span>⚡</span>
            <span>Studio Generator Konten AI (Bilingual ID &amp; EN)</span>
          </h2>
          <p className="text-xs text-[#646970] mt-0.5">
            Generate artikel Indonesia, lalu klik tombol generate English (EN) dengan URL ringkas padat kata kunci.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold px-3 py-1.5 rounded border border-[#dcdcde] hover:bg-[#f0f0f1] text-[#50575e]"
        >
          ✕ Tutup Generator
        </button>
      </div>

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}

      {saveSuccessNotice ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-2 text-xs font-semibold text-[#008a20]">
          ✓ Template prompt dan data target CTA berhasil disimpan permanen di browser!
        </div>
      ) : null}

      {dualPublishSuccess ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-4 text-sm text-[#008a20] whitespace-pre-line rounded">
          <strong>{dualPublishSuccess}</strong>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 bg-[#008a20] text-white text-xs font-bold rounded hover:bg-[#007017]"
            >
              Kembali ke Manajemen Pos
            </button>
          </div>
        </div>
      ) : null}

      {/* Input Form Section */}
      {!idData ? (
        <div className="flex flex-col gap-5">
          {/* 1. Input Topik / Paragraf */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1d2327] mb-1">
              1. Input Topik atau Tempel Paragraf Ide <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={topicOrParagraph}
              onChange={(e) => setTopicOrParagraph(e.target.value)}
              placeholder="Contoh: Promo Dealer Motor Honda Solo diskon uang muka dan simulasi cicilan ringan..."
              className="w-full text-sm px-3 py-2 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
            />
          </div>

          {/* 2 & 3. Prompt Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f6f7f7] p-4 rounded-lg border border-[#dcdcde]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#1d2327]">
                  2. Prompt Riset Entitas &amp; Keyword
                </label>
                <span className="text-[10px] text-[#646970]">Tersimpan Otomatis</span>
              </div>
              <textarea
                rows={5}
                value={keywordPrompt}
                onChange={(e) => setKeywordPrompt(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-2 border border-[#8c8f94] rounded bg-white outline-none focus:border-[#2271b1]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#1d2327]">
                  3. Prompt Pengembangan Konten (Content Prompt)
                </label>
                <span className="text-[10px] text-[#646970]">Tersimpan Otomatis</span>
              </div>
              <textarea
                rows={5}
                value={contentPrompt}
                onChange={(e) => setContentPrompt(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-2 border border-[#8c8f94] rounded bg-white outline-none focus:border-[#2271b1]"
              />
            </div>
          </div>

          {/* 4. DATA UNTUK CTA & PENGARAH TRAFIK (Target Conversion) */}
          <div className="bg-[#f0f7ff] border border-[#cce5ff] p-4 sm:p-5 rounded-lg flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#b8daff] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <h3 className="text-sm font-bold text-[#004085]">
                  4. Data Target Call-To-Action (CTA) &amp; Pengarah Trafik
                </h3>
              </div>
              <span className="text-[10px] font-semibold bg-[#cce5ff] text-[#004085] px-2 py-0.5 rounded">
                Tersimpan Otomatis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1d2327] mb-1">
                  Jenis Tindakan (CTA Type)
                </label>
                <select
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-2 border border-[#8c8f94] rounded bg-white outline-none focus:border-[#2271b1]"
                >
                  <option value="whatsapp">💬 WhatsApp Langsung (Lead Capture)</option>
                  <option value="link">🔗 Tautan URL Halaman / Landing Page</option>
                  <option value="custom">✍️ Kustom Sesuai Arahan</option>
                  <option value="none">Tanpa CTA Khusus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d2327] mb-1">
                  Teks Tombol / Tautan CTA
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="mis. Konsultasi Promo Honda Sekarang"
                  className="w-full text-xs px-2.5 py-2 border border-[#8c8f94] rounded bg-white outline-none focus:border-[#2271b1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d2327] mb-1">
                  {ctaType === "whatsapp" ? "Nomor WhatsApp Tujuan" : "Target URL / Link Tujuan"}
                </label>
                <input
                  type="text"
                  value={ctaTarget}
                  onChange={(e) => setCtaTarget(e.target.value)}
                  placeholder={ctaType === "whatsapp" ? "mis. 6281234567890" : "https://domainanda.com/promo"}
                  className="w-full text-xs px-2.5 py-2 border border-[#8c8f94] rounded bg-white outline-none focus:border-[#2271b1]"
                />
              </div>
            </div>

            {ctaType === "custom" || ctaType === "whatsapp" ? (
              <div>
                <label className="block text-xs font-bold text-[#1d2327] mb-1">
                  Instruksi Gaya CTA ke AI (Agar AI Paham Konteks Penawaran)
                </label>
                <textarea
                  rows={2}
                  value={ctaInstruction}
                  onChange={(e) => setCtaInstruction(e.target.value)}
                  placeholder="Instruksi tambahan bagaimana AI mengajak pembaca..."
                  className="w-full text-xs font-mono px-2.5 py-2 border border-[#8c8f94] rounded bg-white outline-none focus:border-[#2271b1]"
                />
              </div>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={savePrompts}
                className="text-xs font-semibold px-3 py-1.5 rounded border border-[#8c8f94] bg-white hover:bg-[#f0f0f1]"
              >
                💾 Simpan Template &amp; Data CTA
              </button>
              <button
                type="button"
                onClick={resetPrompts}
                className="text-xs text-[#646970] hover:underline"
              >
                Reset ke Default
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGenerateId}
              className="px-6 py-2.5 text-sm font-bold bg-[#008a20] text-white rounded shadow-sm hover:bg-[#007017] transition disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  <span>Sedang Mengembangkan Konten ID &amp; Merancang CTA…</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generate Konten Versi Indonesia</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Preview / ACC Section */
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Top Bar with Language Tabs & Translation Button */}
          <div className="bg-[#f0f7ff] border border-[#cce5ff] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#004085] uppercase tracking-wider mr-2">
                Pilih Bahasa Pratinjau:
              </span>
              <button
                type="button"
                onClick={() => setViewLang("id")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                  viewLang === "id"
                    ? "bg-[#2271b1] text-white shadow-sm"
                    : "bg-white text-[#1d2327] border border-[#8c8f94] hover:bg-[#f0f0f1]"
                }`}
              >
                🇮🇩 Versi Indonesia (ID)
              </button>

              {enData ? (
                <button
                  type="button"
                  onClick={() => setViewLang("en")}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                    viewLang === "en"
                      ? "bg-[#2271b1] text-white shadow-sm"
                      : "bg-white text-[#1d2327] border border-[#8c8f94] hover:bg-[#f0f0f1]"
                  }`}
                >
                  🇬🇧 Versi English (EN)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={translatingEn}
                  onClick={handleGenerateEn}
                  className="px-4 py-1.5 text-xs font-bold bg-[#72aee6] text-[#002a54] hover:bg-[#2271b1] hover:text-white rounded transition flex items-center gap-1.5 border border-[#2271b1]/30 disabled:opacity-60"
                >
                  {translatingEn ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      <span>Menerjemahkan &amp; Optimasi SEO EN…</span>
                    </>
                  ) : (
                    <>
                      <span>🌐</span>
                      <span>Generate Versi Bahasa Inggris (EN)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIdData(null);
                  setEnData(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-[#8c8f94] rounded bg-white hover:bg-[#f6f7f7]"
              >
                🔄 Buat Ulang
              </button>

              {idData ? (
                <button
                  type="button"
                  onClick={handlePublishIdOnly}
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold bg-[#008a20] text-white rounded hover:bg-[#007017] shadow-sm flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Terbitkan Versi ID (Auto-Publish ID)</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Active Article Details */}
          {activeData ? (
            <div className="flex flex-col gap-3">
              <div className="bg-[#f6f7f7] p-3 rounded border border-[#dcdcde] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#50575e] uppercase">
                    Judul ({viewLang.toUpperCase()}) · {activeData.word_count} kata
                  </span>
                  <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#c3c4c7] text-[#2271b1]">
                    URL Slug: /{viewLang}/blog/<strong>{activeData.slug || toSlug(activeData.title, 5)}</strong>
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1d2327]">
                  {activeData.title}
                </h3>
              </div>

              {/* Keywords badges */}
              {activeData.keywords.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#f6f7f7] rounded border border-[#dcdcde]">
                  <span className="text-xs font-bold text-[#50575e] mr-1">Kata Kunci Utama:</span>
                  {activeData.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e7f5ea] text-[#007017] border border-[#c3e6cb]"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Article Body Preview */}
              <div className="border border-[#c3c4c7] rounded-lg p-5 max-h-[480px] overflow-y-auto bg-white article-body">
                <Markdown content={activeData.content_md} />
              </div>

              {/* Bottom ACC Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#dcdcde]">
                <div className="flex items-center gap-2">
                  {!enData && (
                    <button
                      type="button"
                      disabled={translatingEn}
                      onClick={handleGenerateEn}
                      className="px-4 py-2 text-xs font-bold bg-[#f0f7ff] border border-[#2271b1] text-[#2271b1] hover:bg-[#2271b1] hover:text-white rounded transition flex items-center gap-1.5"
                    >
                      {translatingEn ? "Sedang Menerjemahkan ke EN…" : "🌐 Lanjut Generate ke Bahasa EN"}
                    </button>
                  )}
                  {enData && (
                    <span className="text-xs text-[#007017] font-semibold bg-[#e7f5ea] px-2.5 py-1 rounded border border-[#c3e6cb]">
                      ✓ Versi EN siap (disimpan sebagai Draft saat publish)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {idData && (
                    <button
                      type="button"
                      onClick={handlePublishIdOnly}
                      disabled={loading}
                      className="px-5 py-2 text-xs font-bold bg-[#008a20] text-white rounded hover:bg-[#007017] shadow-sm flex items-center gap-1.5"
                    >
                      <span>🚀</span>
                      <span>Terbitkan Versi ID (Auto-Publish)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onAccept(idData!, "id")}
                    className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#2271b1] text-[#2271b1] hover:bg-[#f0f7ff] rounded transition flex items-center gap-1"
                  >
                    <span>Edit Versi ID di Form</span>
                  </button>

                  {enData && (
                    <button
                      type="button"
                      onClick={() => onAccept(enData, "en")}
                      className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#8c8f94] text-[#1d2327] hover:bg-[#f0f0f1] rounded transition flex items-center gap-1"
                    >
                      <span>Edit Versi EN di Form</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
