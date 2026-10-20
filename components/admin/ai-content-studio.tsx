"use client";

import { useState, useEffect } from "react";
import Markdown from "@/components/markdown";
import { apiSend } from "@/lib/client-api";

interface GeneratedData {
  title: string;
  seo_title: string;
  seo_description: string;
  excerpt: string;
  keywords: string[];
  content_md: string;
  word_count: number;
}

interface Props {
  onAccept: (data: GeneratedData) => void;
  onCancel: () => void;
}

const STORAGE_KEYWORD_PROMPT = "cms_custom_keyword_prompt";
const STORAGE_CONTENT_PROMPT = "cms_custom_content_prompt";

const DEFAULT_KEYWORD_PROMPT = `Ekstrak dan kembangkan kata kunci entitas SEO:
1. Target kata kunci utama (Primary Keyword)
2. 5-8 Entity keywords (LSI / semantic terms) yang relevan
3. Klasifikasi search intent pengunjung`;

const DEFAULT_CONTENT_PROMPT = `Tulis artikel SEO mendalam, faktual, dan komprehensif (minimal 800-1200 kata).
- Buat judul menarik (H1) yang mengundang klik
- Struktur konten rapi dengan Sub-heading (H2, H3)
- Sertakan poin-poin actionable, perbandingan, atau tips praktis
- Bahasa mengalir, profesional, dan ramah pembaca
- Optimasi kaidah Google Helpful Content & E-E-A-T`;

export default function AiContentStudio({ onAccept, onCancel }: Props) {
  const [topicOrParagraph, setTopicOrParagraph] = useState("");
  const [keywordPrompt, setKeywordPrompt] = useState(DEFAULT_KEYWORD_PROMPT);
  const [contentPrompt, setContentPrompt] = useState(DEFAULT_CONTENT_PROMPT);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<GeneratedData | null>(null);

  // Muat prompt tersimpan dari LocalStorage browser
  useEffect(() => {
    try {
      const savedKw = localStorage.getItem(STORAGE_KEYWORD_PROMPT);
      if (savedKw) setKeywordPrompt(savedKw);
      const savedCt = localStorage.getItem(STORAGE_CONTENT_PROMPT);
      if (savedCt) setContentPrompt(savedCt);
    } catch {
      // Safe fallback
    }
  }, []);

  function savePrompts() {
    try {
      localStorage.setItem(STORAGE_KEYWORD_PROMPT, keywordPrompt);
      localStorage.setItem(STORAGE_CONTENT_PROMPT, contentPrompt);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    } catch {
      // Ignore
    }
  }

  function resetPrompts() {
    if (confirm("Kembalikan template prompt ke default bawaan?")) {
      setKeywordPrompt(DEFAULT_KEYWORD_PROMPT);
      setContentPrompt(DEFAULT_CONTENT_PROMPT);
      try {
        localStorage.removeItem(STORAGE_KEYWORD_PROMPT);
        localStorage.removeItem(STORAGE_CONTENT_PROMPT);
      } catch {
        // Ignore
      }
    }
  }

  async function handleGenerate() {
    if (!topicOrParagraph.trim()) {
      setError("Masukkan topik artikel atau paragraf awal terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewData(null);

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
        },
      );

      if (res.result) {
        setPreviewData(res.result);
      } else {
        throw new Error("Respon generator kosong.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 bg-white p-4 sm:p-6 rounded-lg border border-[#c3c4c7] shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#dcdcde] gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1d2327] flex items-center gap-2">
            <span>⚡</span>
            <span>Studio Generator Konten AI & Riset Entitas</span>
          </h2>
          <p className="text-xs text-[#646970] mt-0.5">
            Input topik atau paragraf ide, sesuaikan template prompt keyword & konten, lalu preview hasilnya sebelum di-ACC.
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
          ✓ Template prompt keyword & konten berhasil disimpan di browser Anda!
        </div>
      ) : null}

      {/* Input Form Section */}
      {!previewData ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1d2327] mb-1">
              1. Input Topik atau Tempel Paragraf Awal <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={topicOrParagraph}
              onChange={(e) => setTopicOrParagraph(e.target.value)}
              placeholder="Contoh: Promo Dealer Motor Honda Solo terbaru atau tempel satu paragraf draft ide Anda di sini..."
              className="w-full text-sm px-3 py-2 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
            />
          </div>

          {/* Prompt Templates (Accordion / Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f6f7f7] p-4 rounded-lg border border-[#dcdcde]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#1d2327]">
                  2. Prompt Riset Entitas & Keyword
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

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={savePrompts}
                className="text-xs font-semibold px-3 py-1.5 rounded border border-[#8c8f94] bg-white hover:bg-[#f0f0f1]"
              >
                💾 Simpan Template Prompt
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
              onClick={handleGenerate}
              className="px-6 py-2.5 text-sm font-bold bg-[#008a20] text-white rounded shadow-sm hover:bg-[#007017] transition disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  <span>Sedang Mengembangkan Konten AI…</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generate & Kembangkan Konten</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Preview / ACC Section */
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="bg-[#f0f7ff] border border-[#cce5ff] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#004085] uppercase tracking-wider">
                Pratinjau Hasil Generate AI ({previewData.word_count} kata)
              </span>
              <h3 className="text-base font-bold text-[#1d2327] mt-0.5">
                {previewData.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-3.5 py-2 text-xs font-semibold border border-[#8c8f94] rounded bg-white hover:bg-[#f6f7f7]"
              >
                🔄 Generate Ulang
              </button>
              <button
                type="button"
                onClick={() => onAccept(previewData)}
                className="px-5 py-2 text-xs font-bold bg-[#008a20] text-white rounded hover:bg-[#007017] shadow-sm flex items-center gap-1.5"
              >
                <span>✓</span>
                <span>ACC & Masukkan ke Editor</span>
              </button>
            </div>
          </div>

          {/* Keywords & Metadata preview badges */}
          {previewData.keywords.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 p-3 bg-[#f6f7f7] rounded border border-[#dcdcde]">
              <span className="text-xs font-bold text-[#50575e] mr-1">Entitas Keyword:</span>
              {previewData.keywords.map((kw, i) => (
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
          <div className="border border-[#c3c4c7] rounded-lg p-5 max-h-[500px] overflow-y-auto bg-white">
            <Markdown content={previewData.content_md} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#dcdcde]">
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              className="px-4 py-2 text-sm font-medium border border-[#c3c4c7] rounded hover:bg-[#f6f7f7]"
            >
              Kembali Edit Prompt
            </button>
            <button
              type="button"
              onClick={() => onAccept(previewData)}
              className="px-6 py-2 text-sm font-bold bg-[#008a20] text-white rounded hover:bg-[#007017] shadow-sm flex items-center gap-2"
            >
              <span>✓</span>
              <span>ACC & Masukkan ke Editor Form</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
