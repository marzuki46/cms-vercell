"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { ArticleStatus } from "@/types/db";

interface Row {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  language?: "id" | "en";
  published_at: string | null;
  scheduled_for: string | null;
  word_count: number | null;
  reading_time_minutes: number | null;
  author: string | null;
  created_at: string;
}

const TABS: { value: ArticleStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "published", label: "Terbit (Published)" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "archived", label: "Sampah/Arsip" },
];

export default function ArticlesAdmin() {
  const [tab, setTab] = useState<ArticleStatus | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = tab === "all" ? "" : `?status=${tab}`;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet<{ articles: Row[]; total: number }>(
        `/api/admin/articles${query}`,
      );
      setRows(res.articles);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiGet<{ articles: Row[]; total: number }>(
          `/api/admin/articles${query}`,
        );
        if (active) {
          setRows(res.articles);
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
  }, [query]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await apiSend(`/api/admin/articles/${id}`, "PATCH", body);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d2327]">Semua Pos</h1>
          <p className="text-xs text-[#646970] mt-0.5">
            Daftar seluruh artikel blog yang dibuat secara manual atau otomatis via AI.
          </p>
        </div>

        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-[#2271b1] text-white text-sm font-semibold rounded hover:bg-[#135e96] transition shadow-sm"
        >
          ➕ Tambah Pos Baru
        </Link>
      </div>

      {/* Tabs / Filter Filter WP style */}
      <div className="flex items-center gap-2 border-b border-[#c3c4c7] pb-2 text-xs">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setLoading(true);
              setTab(t.value);
            }}
            className={`px-2.5 py-1 rounded transition ${
              tab === t.value
                ? "font-bold text-[#2271b1] bg-white border border-[#c3c4c7]"
                : "text-[#50575e] hover:text-[#2271b1]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}

      {/* WP-Style Table */}
      <div className="bg-white border border-[#c3c4c7] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#646970]">Memuat data pos...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#646970]">
            Tidak ada pos pada kategori ini. Klik tombol <strong>Tambah Pos Baru</strong> untuk mulai menulis.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-[#2c3338] text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Judul Pos</th>
                  <th className="py-3 px-4 w-32">Penulis</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-28">Kata</th>
                  <th className="py-3 px-4 w-40">Tanggal</th>
                  <th className="py-3 px-4 w-48 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcdcde]">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-[#fbfbfb] transition group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2271b1] group-hover:underline">
                        <Link href={`/admin/articles/${a.id}`}>{a.title}</Link>
                      </div>
                      <div className="text-xs text-[#646970] mt-1 flex items-center gap-3">
                        <Link href={`/admin/articles/${a.id}`} className="hover:text-[#2271b1]">
                          Edit
                        </Link>
                        <span>|</span>
                        {a.status === "published" ? (
                          <Link
                            href={`/${a.language ?? "id"}/blog/${a.slug}`}
                            target="_blank"
                            className="text-[#008a20] hover:underline"
                          >
                            Lihat di Web ↗
                          </Link>
                        ) : (
                          <span className="italic text-gray-400">Belum publish</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#50575e]">{a.author || "Admin"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          a.status === "published"
                            ? "bg-[#edfaef] text-[#008a20]"
                            : a.status === "draft"
                            ? "bg-[#f0f0f1] text-[#50575e]"
                            : "bg-[#fcf9e8] text-[#996800]"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#50575e]">{a.word_count ?? 0}</td>
                    <td className="py-3 px-4 text-xs text-[#50575e]">
                      {a.published_at ? (
                        <span>Terbit: {new Date(a.published_at).toLocaleDateString("id-ID")}</span>
                      ) : (
                        <span>Dibuat: {new Date(a.created_at).toLocaleDateString("id-ID")}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs">
                        {a.status !== "published" ? (
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            onClick={() => patch(a.id, { status: "published" })}
                            className="px-2.5 py-1 bg-[#008a20] text-white rounded hover:bg-[#007017] transition disabled:opacity-50"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            onClick={() => patch(a.id, { status: "draft" })}
                            className="px-2.5 py-1 bg-[#f0f0f1] border border-[#c3c4c7] text-[#50575e] rounded hover:bg-[#e0e0e0] transition disabled:opacity-50"
                          >
                            Jadikan Draft
                          </button>
                        )}
                        <Link
                          href={`/admin/articles/${a.id}`}
                          className="px-2.5 py-1 bg-[#2271b1] text-white rounded hover:bg-[#135e96] transition"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
