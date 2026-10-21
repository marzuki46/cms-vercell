"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { RedirectItem } from "@/types/db";

export default function RedirectsAdmin() {
  const [redirects, setRedirects] = useState<RedirectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ redirects: RedirectItem[] }>("/api/admin/redirects");
      setRedirects(res.redirects ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromPath.trim() || !toPath.trim()) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await apiSend("/api/admin/redirects", "POST", {
        from_path: fromPath.trim(),
        to_path: toPath.trim(),
        status_code: statusCode,
      });

      setNotice(`✓ Pengalihan dari "${fromPath}" ke "${toPath}" berhasil disimpan.`);
      setFromPath("");
      setToPath("");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: RedirectItem) {
    if (!confirm(`Hapus aturan redirect dari "${item.from_path}"?`)) return;

    setDeletingId(item.id);
    setError(null);
    setNotice(null);

    try {
      await apiSend(`/api/admin/redirects/${item.id}`, "DELETE");
      setNotice(`✓ Aturan redirect "${item.from_path}" telah dihapus.`);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = redirects.filter(
    (r) =>
      r.from_path.toLowerCase().includes(search.toLowerCase()) ||
      r.to_path.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1d2327]">Kelola Redirect URL (301 / 302)</h1>
        <p className="text-xs text-[#646970] mt-0.5">
          Atur pengalihan URL lama ke URL baru untuk mencegah error 404, memindahkan halaman, dan menjaga reputasi SEO Google Anda.
        </p>
      </div>

      {notice ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#008a20] flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs text-[#50575e] hover:underline"
          >
            Tutup
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}

      {/* Form Tambah Redirect Baru */}
      <div className="bg-white border border-[#c3c4c7] rounded-lg p-5 shadow-xs">
        <h2 className="text-sm font-bold text-[#1d2327] mb-3">➕ Tambah Aturan Redirect Baru</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-12">
            {/* From Path */}
            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#50575e] uppercase tracking-wide">
                URL Asal (From Path)
              </label>
              <input
                type="text"
                required
                value={fromPath}
                onChange={(e) => setFromPath(e.target.value)}
                placeholder="/halaman-lama atau /id/promo"
                className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 text-sm outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              />
              <span className="text-[11px] text-[#646970]">
                Jalur relatif yang ingin dialihkan (harus diawali garis miring <code>/</code>)
              </span>
            </div>

            {/* To Path */}
            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#50575e] uppercase tracking-wide">
                URL Tujuan (To Path / Target)
              </label>
              <input
                type="text"
                required
                value={toPath}
                onChange={(e) => setToPath(e.target.value)}
                placeholder="/id/blog/artikel-baru atau https://domain-luar.com"
                className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 text-sm outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              />
              <span className="text-[11px] text-[#646970]">
                Tujuan pengalihan (bisa URL internal atau tautan eksternal <code>https://...</code>)
              </span>
            </div>

            {/* HTTP Status Code */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#50575e] uppercase tracking-wide">
                Tipe Redirect
              </label>
              <select
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value) as 301 | 302)}
                className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 text-sm outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              >
                <option value={301}>301 (Permanen - SEO)</option>
                <option value={302}>302 (Sementara)</option>
              </select>
              <span className="text-[11px] text-[#646970]">
                301 memindahkan bobot SEO Google
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#2271b1] text-white rounded font-semibold text-xs hover:bg-[#135e96] transition disabled:opacity-60 shadow-xs"
            >
              {saving ? "Menyimpan…" : "Simpan Aturan Redirect"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Aturan Redirect */}
      <div className="bg-white border border-[#c3c4c7] rounded-lg shadow-xs overflow-hidden flex flex-col">
        {/* Table Filter Bar */}
        <div className="p-3 border-b border-[#c3c4c7] flex flex-wrap items-center justify-between gap-3 bg-[#f6f7f7]">
          <div className="text-xs font-semibold text-[#1d2327]">
            Daftar Redirect Terdaftar ({filtered.length} dari {redirects.length})
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari URL asal atau tujuan..."
            className="w-full sm:w-64 rounded border border-[#8c8f94] bg-white px-2.5 py-1 text-xs outline-none focus:border-[#2271b1]"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#646970]">Memuat daftar redirect...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#646970]">
            {redirects.length === 0
              ? "Belum ada aturan redirect manual yang ditambahkan."
              : "Tidak ada redirect yang cocok dengan pencarian."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-[#f0f0f1] font-semibold text-[#1d2327]">
                  <th className="py-2.5 px-4">URL Asal (From)</th>
                  <th className="py-2.5 px-4">URL Tujuan (To)</th>
                  <th className="py-2.5 px-4 w-28">Status HTTP</th>
                  <th className="py-2.5 px-4 w-32">Dibuat</th>
                  <th className="py-2.5 px-4 w-20 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcdcde]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fbfbfb] transition">
                    <td className="py-2.5 px-4 font-mono font-medium text-[#2271b1] select-all">
                      {item.from_path}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#1d2327] select-all">
                      {item.to_path}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.status_code === 301
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#646970]">
                      {new Date(item.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item)}
                        className="text-[#d63638] hover:underline font-semibold disabled:opacity-50"
                      >
                        {deletingId === item.id ? "…" : "Hapus"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card Otomasi SEO */}
      <div className="bg-[#f0f7ff] border border-[#cce5ff] rounded-lg p-4 text-xs text-[#004085] flex flex-col gap-1.5">
        <div className="font-bold">💡 Tips Praktis Manajemen Redirect:</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Otomatis Saat Ubah Slug:</strong> Jika Anda mengubah slug artikel di menu pos, sistem Supabase otomatis membuat entri redirect 301 dari slug lama ke slug baru.
          </li>
          <li>
            <strong>Eksekusi Cepat di Edge Server:</strong> Redirect diproses langsung di level Edge Middleware (proxy) sehingga pengunjung dan Googlebot dialihkan instan tanpa membebani rendering halaman.
          </li>
          <li>
            <strong>Dukungan Tautan Eksternal:</strong> Anda juga bisa mengarahkan path lama ke domain baru seperti <code>https://domainbaru.com/info</code>.
          </li>
        </ul>
      </div>
    </div>
  );
}
