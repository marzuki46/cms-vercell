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
  translation_of?: string | null;
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

interface TranslationStats {
  totalId: number;
  translatedEn: number;
  untranslatedId: number;
  percentTranslated: number;
  totalEn: number;
}

const PAGE_SIZE = 15;

export default function ArticlesAdmin() {
  const [tab, setTab] = useState<ArticleStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TranslationStats>({
    totalId: 0,
    translatedEn: 0,
    untranslatedId: 0,
    percentTranslated: 0,
    totalEn: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const offset = (page - 1) * PAGE_SIZE;
  const statusParam = tab === "all" ? "" : `&status=${tab}`;
  const query = `?limit=${PAGE_SIZE}&offset=${offset}${statusParam}`;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet<{
        articles: Row[];
        total: number;
        stats?: TranslationStats;
      }>(`/api/admin/articles${query}`);
      setRows(res.articles);
      setTotal(res.total);
      if (res.stats) setStats(res.stats);
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
        const res = await apiGet<{
          articles: Row[];
          total: number;
          stats?: TranslationStats;
        }>(`/api/admin/articles${query}`);
        if (active) {
          setRows(res.articles);
          setTotal(res.total);
          if (res.stats) setStats(res.stats);
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

  async function handleDelete(row: Row) {
    if (busyId) return;
    const ok = window.confirm(
      `Apakah Anda yakin ingin menghapus artikel "${row.title}"?\nTindakan ini permanen dan tidak dapat dibatalkan.`,
    );
    if (!ok) return;

    setBusyId(row.id);
    setError(null);
    setNotice(null);

    try {
      await apiSend(`/api/admin/articles/${row.id}`, "DELETE");
      setNotice(`✓ Artikel "${row.title}" berhasil dihapus.`);
      await refresh();
    } catch (err) {
      setError(`Gagal menghapus artikel: ${(err as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleTranslate(row: Row) {
    if (translatingId) return;
    setTranslatingId(row.id);
    setError(null);
    setNotice(null);

    try {
      // 1. Get full article
      const full = await apiGet<{ article: any }>(`/api/admin/articles/${row.id}`);
      const art = full.article;

      // 2. Translate with AI
      const genRes = await apiSend<{ success: boolean; result: any }>(
        "/api/admin/generate-en",
        "POST",
        {
          idTitle: art.title,
          idContent: art.content_md,
          idExcerpt: art.excerpt,
          idKeywords: art.keywords,
        },
      );

      if (!genRes.result) {
        throw new Error("AI gagal menghasilkan translasi");
      }

      // 3. Create English article as published if original was published, else draft
      const targetStatus = art.status === "published" ? "published" : "draft";
      await apiSend("/api/admin/articles", "POST", {
        title: genRes.result.title,
        slug: genRes.result.slug,
        content_md: genRes.result.content_md,
        excerpt: genRes.result.excerpt,
        seo_title: genRes.result.seo_title,
        seo_description: genRes.result.seo_description,
        language: "en",
        status: targetStatus,
        author: art.author || "Admin",
        translation_of: row.id,
      });

      setNotice(
        `✓ Artikel EN berhasil dibuat: "${genRes.result.title}" (Status: ${targetStatus}). Halaman /en/ sekarang aktif.`,
      );
      await refresh();
    } catch (err) {
      setError(`Gagal translate: ${(err as Error).message}`);
    } finally {
      setTranslatingId(null);
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

      {/* 4 Cards Top: Translation & Articles Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Konten ID */}
        <div className="bg-white border border-[#c3c4c7] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#50575e]">
              Konten Asli (ID)
            </span>
            <span className="text-lg">🇮🇩</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1d2327]">{stats.totalId}</span>
            <span className="text-xs text-[#646970]">artikel</span>
          </div>
          <p className="mt-1 text-[11px] text-[#646970]">
            Basis artikel bahasa Indonesia
          </p>
        </div>

        {/* Card 2: Sudah Terjemah EN */}
        <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Berhasil Translate
            </span>
            <span className="text-lg">✅</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{stats.translatedEn}</span>
            <span className="text-xs text-emerald-800">dari {stats.totalId} ID</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            Tersedia versi English (/en/)
          </p>
        </div>

        {/* Card 3: Belum Terjemah EN */}
        <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Belum Translate
            </span>
            <span className="text-lg">⏳</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{stats.untranslatedId}</span>
            <span className="text-xs text-amber-800">antrean ID</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600 font-medium">
            Siap ditranslasikan otomatis / manual
          </p>
        </div>

        {/* Card 4: Progress % */}
        <div className="bg-white border border-[#2271b1]/30 rounded-lg p-4 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
              Progress Translate
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#2271b1] text-white">
              {stats.percentTranslated}%
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-[#1d2327]">
                {stats.percentTranslated}%
              </span>
              <span className="text-xs text-[#50575e]">
                {stats.translatedEn}/{stats.totalId} artikel
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#2271b1] h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, stats.percentTranslated))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Filter Filter WP style */}
      <div className="flex items-center justify-between border-b border-[#c3c4c7] pb-2 text-xs">
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setLoading(true);
                setPage(1);
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
        <div className="text-xs text-[#646970]">
          Total pos: <strong>{total}</strong>
        </div>
      </div>

      {notice ? (
        <div className="bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#008a20] flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs text-muted hover:underline"
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
                  <th className="py-3 px-4 w-20">Bahasa</th>
                  <th className="py-3 px-4 w-32">Penulis</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-24">Kata</th>
                  <th className="py-3 px-4 w-36">Tanggal</th>
                  <th className="py-3 px-4 w-64 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcdcde]">
                {(() => {
                  // Group articles into parent (ID) and child (EN translations)
                  const childEnByParentId = new Map<string, Row[]>();
                  const parentRows: Row[] = [];
                  const orphanEnRows: Row[] = [];

                  // First pass: identify explicit translation_of children
                  for (const r of rows) {
                    if (r.translation_of) {
                      const list = childEnByParentId.get(r.translation_of) ?? [];
                      list.push(r);
                      childEnByParentId.set(r.translation_of, list);
                    }
                  }

                  // Second pass: identify parents vs standalone ENs
                  for (const r of rows) {
                    if (r.translation_of) {
                      // Already a child
                      continue;
                    }
                    if (r.language === "en") {
                      // Check heuristic if any ID row matches by slug or topic_id
                      const parentCandidate = rows.find(
                        (p) =>
                          p.id !== r.id &&
                          p.language !== "en" &&
                          (p.slug === r.slug ||
                            r.slug === `${p.slug}-en` ||
                            r.slug.includes(p.slug)),
                      );
                      if (parentCandidate) {
                        const list = childEnByParentId.get(parentCandidate.id) ?? [];
                        list.push(r);
                        childEnByParentId.set(parentCandidate.id, list);
                      } else {
                        orphanEnRows.push(r);
                      }
                    } else {
                      parentRows.push(r);
                    }
                  }

                  const renderRow = (a: Row, isChild = false) => {
                    const lang = a.language ?? "id";
                    const isEn = lang === "en";
                    const isTranslating = translatingId === a.id;
                    const children = childEnByParentId.get(a.id) ?? [];
                    const hasEnTranslation = isEn ? true : children.length > 0;

                    return (
                      <tr
                        key={a.id}
                        className={`transition group ${
                          isChild
                            ? "bg-[#faf8fd] border-l-4 border-l-purple-500 hover:bg-[#f3edf9]"
                            : "hover:bg-[#fbfbfb]"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isChild ? (
                              <span className="text-purple-600 font-bold select-none text-base pl-2">
                                ↳
                              </span>
                            ) : null}
                            <div className="font-semibold text-[#2271b1] group-hover:underline">
                              <Link href={`/admin/articles/${a.id}`}>
                                {isChild ? (
                                  <span className="text-purple-900">{a.title}</span>
                                ) : (
                                  a.title
                                )}
                              </Link>
                            </div>
                            {!isChild && hasEnTranslation ? (
                              <span
                                title="Sudah memiliki versi terjemahan English"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                              >
                                ✓ Ada EN ({children.length})
                              </span>
                            ) : !isChild ? (
                              <span
                                title="Belum memiliki versi terjemahan English"
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                              >
                                Belum EN
                              </span>
                            ) : null}
                          </div>
                          <div
                            className={`text-xs text-[#646970] mt-1 flex items-center gap-3 ${
                              isChild ? "pl-6" : ""
                            }`}
                          >
                            <Link href={`/admin/articles/${a.id}`} className="hover:text-[#2271b1]">
                              Edit
                            </Link>
                            <span>|</span>
                            <button
                              type="button"
                              disabled={busyId === a.id || isTranslating}
                              onClick={() => handleDelete(a)}
                              className="text-[#d63638] hover:underline disabled:opacity-50 font-medium cursor-pointer"
                            >
                              Hapus
                            </button>
                            <span>|</span>
                            {a.status === "published" ? (
                              <Link
                                href={`/${lang}/blog/${a.slug}`}
                                target="_blank"
                                className="text-[#008a20] hover:underline"
                              >
                                Lihat di Web (/{lang}/) ↗
                              </Link>
                            ) : (
                              <span className="italic text-gray-400">Belum publish</span>
                            )}
                            {isChild ? (
                              <>
                                <span>|</span>
                                <span className="text-purple-600 text-[11px] font-medium">
                                  Terjemahan dari pos induk ID
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              isEn
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {lang}
                          </span>
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
                            {!isEn && !hasEnTranslation && (
                              <button
                                type="button"
                                disabled={isTranslating}
                                onClick={() => handleTranslate(a)}
                                className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-300 rounded hover:bg-purple-100 transition disabled:opacity-50"
                                title="Terjemahkan otomatis ke English menggunakan AI dan langsung buat artikel anak /en/"
                              >
                                {isTranslating ? "⏳ Translating..." : "🌐 Translate EN"}
                              </button>
                            )}
                            {a.status !== "published" ? (
                              <button
                                type="button"
                                disabled={busyId === a.id || isTranslating}
                                onClick={() => patch(a.id, { status: "published" })}
                                className="px-2.5 py-1 bg-[#008a20] text-white rounded hover:bg-[#007017] transition disabled:opacity-50"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busyId === a.id || isTranslating}
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
                            <button
                              type="button"
                              disabled={busyId === a.id || isTranslating}
                              onClick={() => handleDelete(a)}
                              className="px-2 py-1 bg-red-50 text-[#d63638] border border-red-200 rounded hover:bg-red-100 transition disabled:opacity-50"
                              title="Hapus permanen artikel"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  };

                  const output: React.ReactNode[] = [];
                  for (const parent of parentRows) {
                    output.push(renderRow(parent, false));
                    const children = childEnByParentId.get(parent.id) ?? [];
                    for (const child of children) {
                      output.push(renderRow(child, true));
                    }
                  }

                  // Orphan ENs (created standalone)
                  for (const orphan of orphanEnRows) {
                    output.push(renderRow(orphan, false));
                  }

                  return output;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Pagination Controls */}
      {total > PAGE_SIZE ? (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#c3c4c7] px-4 py-3 rounded shadow-xs text-xs text-[#50575e]">
          <div>
            Menampilkan{" "}
            <strong>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
            </strong>{" "}
            dari <strong>{total}</strong> pos
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage(1);
              }}
              className="px-2 py-1 border border-[#c3c4c7] rounded bg-[#f6f7f7] hover:bg-white disabled:opacity-40 font-medium"
              title="Halaman pertama"
            >
              « Pertama
            </button>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => Math.max(1, p - 1));
              }}
              className="px-2.5 py-1 border border-[#c3c4c7] rounded bg-[#f6f7f7] hover:bg-white disabled:opacity-40 font-medium"
              title="Halaman sebelumnya"
            >
              ‹ Sebelumnya
            </button>

            <span className="px-2 py-1 font-semibold text-[#1d2327]">
              Halaman {page} dari {Math.ceil(total / PAGE_SIZE)}
            </span>

            <button
              type="button"
              disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
              className="px-2.5 py-1 border border-[#c3c4c7] rounded bg-[#f6f7f7] hover:bg-white disabled:opacity-40 font-medium"
              title="Halaman selanjutnya"
            >
              Selanjutnya ›
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
              onClick={() => {
                setLoading(true);
                setPage(Math.ceil(total / PAGE_SIZE));
              }}
              className="px-2 py-1 border border-[#c3c4c7] rounded bg-[#f6f7f7] hover:bg-white disabled:opacity-40 font-medium"
              title="Halaman terakhir"
            >
              Terakhir »
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
