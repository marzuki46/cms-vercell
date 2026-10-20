"use client";

import { useRef, useEffect, useState } from "react";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown-html";

interface Props {
  value: string;
  onChange: (markdown: string) => void;
}

export default function VisualHtmlEditor({ value, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<"visual" | "html">("visual");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const visualRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync incoming markdown value into HTML state
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const converted = markdownToHtml(value || "");
    setHtmlContent(converted);
    if (visualRef.current && activeTab === "visual") {
      visualRef.current.innerHTML = converted;
    }
  }, [value, activeTab]);

  function handleVisualInput() {
    if (!visualRef.current) return;
    const currentHtml = visualRef.current.innerHTML;
    setHtmlContent(currentHtml);
    isInternalUpdate.current = true;
    const md = htmlToMarkdown(currentHtml);
    onChange(md);
  }

  function handleHtmlChange(newHtml: string) {
    setHtmlContent(newHtml);
    isInternalUpdate.current = true;
    const md = htmlToMarkdown(newHtml);
    onChange(md);
  }

  function exec(command: string, value: string | undefined = undefined) {
    document.execCommand(command, false, value);
    if (visualRef.current) {
      visualRef.current.focus();
      handleVisualInput();
    }
  }

  function insertLink() {
    const url = prompt("Masukkan URL tautan (https://...):");
    if (url) {
      exec("createLink", url);
    }
  }

  function insertImage() {
    const url = prompt("Masukkan URL Gambar (https://...):");
    if (url) {
      exec("insertImage", url);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-[#c3c4c7] bg-white shadow-sm overflow-hidden">
      {/* Editor Top Bar: Tabs & Word Processor Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#dcdcde] bg-[#f6f7f7] p-2 gap-2">
        {/* Tab Switcher: Visual (Word) vs HTML */}
        <div className="flex items-center gap-1 bg-[#e0e0e0] p-0.5 rounded text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("visual");
              if (visualRef.current) {
                visualRef.current.innerHTML = htmlContent;
              }
            }}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "visual"
                ? "bg-white text-[#1d2327] shadow-sm font-bold"
                : "text-[#50575e] hover:text-[#1d2327]"
            }`}
          >
            📝 Visual (Mirip Word)
          </button>
          <button
            type="button"
            onClick={() => {
              if (visualRef.current) {
                setHtmlContent(visualRef.current.innerHTML);
              }
              setActiveTab("html");
            }}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "html"
                ? "bg-white text-[#1d2327] shadow-sm font-bold"
                : "text-[#50575e] hover:text-[#1d2327]"
            }`}
          >
            &lt;/&gt; Kode HTML
          </button>
        </div>

        {/* Word Processor Toolbar (Only in Visual Mode) */}
        {activeTab === "visual" ? (
          <div className="flex flex-wrap items-center gap-1">
            <select
              aria-label="Format heading"
              onChange={(e) => {
                const val = e.target.value;
                if (val) exec("formatBlock", val);
                e.target.value = "";
              }}
              className="text-xs bg-white border border-[#8c8f94] rounded px-2 py-1 outline-none text-[#1d2327]"
            >
              <option value="">Gaya Teks...</option>
              <option value="<p>">Paragraf Normal</option>
              <option value="<h2>">Judul Heading 2 (H2)</option>
              <option value="<h3>">Sub-Judul Heading 3 (H3)</option>
              <option value="<h4>">Heading 4 (H4)</option>
              <option value="<blockquote>">Kutipan (Quote)</option>
            </select>

            <div className="h-4 w-[1px] bg-[#dcdcde] mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => exec("bold")}
              title="Tebal (Bold)"
              className="px-2 py-1 text-xs font-bold border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => exec("italic")}
              title="Miring (Italic)"
              className="px-2 py-1 text-xs italic font-serif border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => exec("underline")}
              title="Garis Bawah (Underline)"
              className="px-2 py-1 text-xs underline border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              U
            </button>

            <div className="h-4 w-[1px] bg-[#dcdcde] mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => exec("insertUnorderedList")}
              title="Daftar Bullet"
              className="px-2 py-1 text-xs border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => exec("insertOrderedList")}
              title="Daftar Nomor"
              className="px-2 py-1 text-xs border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              1. List
            </button>

            <div className="h-4 w-[1px] bg-[#dcdcde] mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={insertLink}
              title="Sisipkan Tautan (Link)"
              className="px-2 py-1 text-xs border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              🔗 Link
            </button>
            <button
              type="button"
              onClick={insertImage}
              title="Sisipkan Gambar"
              className="px-2 py-1 text-xs border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1]"
            >
              🖼️ Gambar
            </button>
            <button
              type="button"
              onClick={() => exec("removeFormat")}
              title="Hapus Pemformatan"
              className="px-2 py-1 text-xs border border-[#8c8f94] rounded bg-white hover:bg-[#f0f0f1] text-red-600"
            >
              🧹 Bersihkan
            </button>
          </div>
        ) : (
          <span className="text-xs text-[#646970] italic">
            Edit langsung tag HTML (&lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, dll)
          </span>
        )}
      </div>

      {/* Editor Body */}
      {activeTab === "visual" ? (
        <div
          ref={visualRef}
          contentEditable
          onInput={handleVisualInput}
          onBlur={handleVisualInput}
          className="min-h-[380px] max-h-[700px] overflow-y-auto p-4 sm:p-6 outline-none text-[#1d2327] bg-white text-base leading-relaxed article-body focus:ring-1 focus:ring-[#2271b1]"
          style={{ minHeight: "380px" }}
          data-placeholder="Tulis artikel Anda di sini seperti di Microsoft Word..."
        />
      ) : (
        <textarea
          rows={18}
          value={htmlContent}
          onChange={(e) => handleHtmlChange(e.target.value)}
          spellCheck={false}
          className="w-full font-mono text-xs sm:text-sm p-4 bg-[#1d2327] text-[#50fa7b] leading-relaxed outline-none focus:ring-1 focus:ring-[#2271b1] resize-y"
          style={{ minHeight: "380px" }}
        />
      )}

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-t border-[#dcdcde] bg-[#f6f7f7] text-[11px] text-[#646970]">
        <span>
          Mode aktif: <strong>{activeTab === "visual" ? "Visual Editor (Word)" : "Editor Kode HTML"}</strong>
        </span>
        <span>
          Otomatis sinkron ke database SEO & format tampilan publik
        </span>
      </div>
    </div>
  );
}
