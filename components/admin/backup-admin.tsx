"use client";

import { useState } from "react";
import { apiSend } from "@/lib/client-api";

interface ImportResults {
  settingsRestored: number;
  authorsRestored: number;
  categoriesRestored: number;
  articlesRestored: number;
  redirectsRestored: number;
  errors: string[];
}

export default function BackupAdmin() {
  const [downloading, setDownloading] = useState(false);
  const [fileContent, setFileContent] = useState<any | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Import options
  const [restoreSettings, setRestoreSettings] = useState(true);
  const [restoreArticles, setRestoreArticles] = useState(true);
  const [restoreAuthors, setRestoreAuthors] = useState(true);
  const [restoreCategories, setRestoreCategories] = useState(true);
  const [restoreRedirects, setRestoreRedirects] = useState(true);

  async function handleExport() {
    setDownloading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/backup/export");
      if (!res.ok) throw new Error("Gagal mengunduh backup dari server.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `backup-cms-masboss-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotice("✓ File backup berhasil diunduh ke komputer Anda.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResults(null);
    setNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data) {
          throw new Error("Format berkas backup tidak valid (objek 'data' tidak ditemukan).");
        }
        setFileContent(json);
      } catch (err) {
        setError(`Berkas bukan JSON yang valid: ${(err as Error).message}`);
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!fileContent) return;

    if (!confirm("Apakah Anda yakin ingin memulihkan data dari berkas cadangan ini? Data yang ada akan diperbarui.")) {
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);
    setNotice(null);

    try {
      const res = await apiSend<{ success: boolean; results: ImportResults }>(
        "/api/admin/backup/import",
        "POST",
        {
          data: fileContent.data,
          options: {
            restoreSettings,
            restoreArticles,
            restoreAuthors,
            restoreCategories,
            restoreRedirects,
          },
        },
      );

      setResults(res.results);
      if (res.results.errors.length === 0) {
        setNotice("✓ Seluruh data cadangan berhasil dipulihkan ke database!");
      } else {
        setNotice(`Selesai dengan beberapa catatan (lihat rincian di bawah).`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1d2327]">Backup & Restore (Ekspor & Impor)</h1>
        <p className="text-xs text-[#646970] mt-1">
          Unduh seluruh konfigurasi dan artikel blog sebagai cadangan mandiri, atau pulihkan data kapan saja tanpa risiko kehilangan konten.
        </p>
      </div>

      {notice ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#008a20] rounded-r">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a] rounded-r">
          {error}
        </div>
      ) : null}

      {/* Grid 2 Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Ekspor */}
        <div className="bg-white border border-[#c3c4c7] rounded shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#1d2327]">
              <span className="text-2xl">💾</span>
              <h2 className="text-lg font-bold">Ekspor Cadangan (Backup)</h2>
            </div>
            <p className="text-xs text-[#646970] leading-relaxed mb-4">
              Simpan seluruh data situs ke dalam berkas tunggal JSON:
            </p>
            <ul className="text-xs text-[#50575e] space-y-1 mb-6 list-disc list-inside">
              <li>Pengaturan situs, nama brand & WhatsApp</li>
              <li>Seluruh artikel (ID & EN) beserta konten Markdown & SEO</li>
              <li>Profil penulis E-E-A-T & Kategori cluster</li>
              <li>Aturan redirect 301 yang tersimpan</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={downloading}
            onClick={handleExport}
            className="w-full py-2.5 px-4 bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold text-sm rounded transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {downloading ? "⏳ Mengunduh Cadangan..." : "📥 Unduh Cadangan Penuh (.JSON)"}
          </button>
        </div>

        {/* Card 2: Impor */}
        <div className="bg-white border border-[#c3c4c7] rounded shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#1d2327]">
              <span className="text-2xl">🔄</span>
              <h2 className="text-lg font-bold">Impor / Pulihkan Data</h2>
            </div>
            <p className="text-xs text-[#646970] leading-relaxed mb-3">
              Pilih berkas JSON cadangan yang telah Anda unduh sebelumnya untuk dipulihkan ke database.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#2c3338] mb-1">
                Pilih Berkas Backup (.json)
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="block w-full text-xs text-[#50575e] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-[#c3c4c7] file:text-xs file:font-semibold file:bg-[#f0f0f1] file:text-[#2c3338] hover:file:bg-[#e0e0e0] cursor-pointer"
              />
            </div>

            {fileContent && (
              <div className="p-3 bg-[#f6f7f7] border border-[#dcdcde] rounded text-xs space-y-2 mb-4">
                <div className="font-semibold text-[#1d2327]">
                  Ringkasan Berkas: <span className="font-normal text-muted">{fileName}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-[#50575e]">
                  <div>Artikel: <strong>{fileContent.counts?.articles ?? fileContent.data?.articles?.length ?? 0}</strong></div>
                  <div>Penulis: <strong>{fileContent.counts?.authors ?? fileContent.data?.authors?.length ?? 0}</strong></div>
                  <div>Kategori: <strong>{fileContent.counts?.categories ?? fileContent.data?.categories?.length ?? 0}</strong></div>
                  <div>Pengaturan: <strong>{fileContent.counts?.settings ?? fileContent.data?.settings?.length ?? 0}</strong></div>
                </div>

                <div className="pt-2 border-t border-[#dcdcde] space-y-1">
                  <span className="font-semibold text-[#1d2327] block">Pilih komponen yang dipulihkan:</span>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={restoreArticles}
                      onChange={(e) => setRestoreArticles(e.target.checked)}
                    />
                    Artikel Blog & SEO
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={restoreSettings}
                      onChange={(e) => setRestoreSettings(e.target.checked)}
                    />
                    Pengaturan Situs & WhatsApp
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={restoreAuthors}
                      onChange={(e) => setRestoreAuthors(e.target.checked)}
                    />
                    Profil Penulis (E-E-A-T)
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={restoreCategories}
                      onChange={(e) => setRestoreCategories(e.target.checked)}
                    />
                    Kategori & Topic Cluster
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={restoreRedirects}
                      onChange={(e) => setRestoreRedirects(e.target.checked)}
                    />
                    Aturan Redirect 301
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={uploading || !fileContent}
            onClick={handleImport}
            className="w-full py-2.5 px-4 bg-[#008a20] hover:bg-[#007017] text-white font-semibold text-sm rounded transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? "⏳ Memulihkan Data..." : "🚀 Mulai Pulihkan Data"}
          </button>
        </div>
      </div>

      {/* Report Hasil Import */}
      {results && (
        <div className="bg-white border border-[#c3c4c7] rounded p-5 shadow-sm text-xs">
          <h3 className="font-bold text-sm text-[#1d2327] mb-2">Laporan Pemulihan Data:</h3>
          <ul className="space-y-1 text-[#50575e]">
            <li>✓ Artikel dipulihkan: <strong>{results.articlesRestored}</strong></li>
            <li>✓ Pengaturan dipulihkan: <strong>{results.settingsRestored}</strong></li>
            <li>✓ Penulis dipulihkan: <strong>{results.authorsRestored}</strong></li>
            <li>✓ Kategori dipulihkan: <strong>{results.categoriesRestored}</strong></li>
            <li>✓ Redirect dipulihkan: <strong>{results.redirectsRestored}</strong></li>
          </ul>

          {results.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              <strong className="block mb-1">Catatan Kesalahan:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {results.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
