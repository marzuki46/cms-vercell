"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Topic, TopicStatus } from "@/types/db";

const TABS: { value: TopicStatus | "all"; label: string }[] = [
  { value: "idea", label: "Ide" },
  { value: "approved", label: "Disetujui" },
  { value: "used", label: "Terpakai" },
  { value: "rejected", label: "Ditolak" },
  { value: "all", label: "Semua" },
];

export default function TopicsAdmin() {
  const [tab, setTab] = useState<TopicStatus | "all">("idea");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");

  const query = tab === "all" ? "" : `?status=${tab}`;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet<{ topics: Topic[] }>(`/api/admin/topics${query}`);
      setTopics(res.topics);
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
        const res = await apiGet<{ topics: Topic[] }>(
          `/api/admin/topics${query}`,
        );
        if (active) {
          setTopics(res.topics);
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

  async function setStatus(id: string, status: TopicStatus) {
    setBusyId(id);
    setError(null);
    try {
      await apiSend(`/api/admin/topics/${id}`, "PATCH", { status });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiSend(`/api/admin/topics/${id}`, "DELETE");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function generate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiSend("/api/admin/generate", "POST", {
        action: "generate",
        topicId: id,
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await apiSend("/api/admin/topics", "POST", {
        title: title.trim(),
        primary_keyword: keyword.trim() || undefined,
      });
      setTitle("");
      setKeyword("");
      if (tab !== "approved" && tab !== "all") setTab("approved");
      else await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={addManual}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-[#c3c4c7] bg-white p-4 shadow-sm"
      >
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-bold text-[#1d2327]">Judul topik manual</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Panduan lengkap optimasi Core Web Vitals"
            className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-bold text-[#1d2327]">Kata kunci utama</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="mis. core web vitals"
            className="w-48 rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-[#2271b1] text-white px-4 py-2 text-sm font-semibold hover:bg-[#135e96] transition shadow-sm"
        >
          ➕ Tambah Topik
        </button>
      </form>

      <div className="flex flex-wrap gap-2 border-b border-[#c3c4c7] pb-2 text-xs">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setLoading(true);
              setTab(t.value);
            }}
            className={`px-3 py-1.5 rounded transition ${
              tab === t.value
                ? "font-bold text-[#2271b1] bg-white border border-[#c3c4c7] shadow-xs"
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

      {loading ? (
        <p className="text-sm text-[#646970]">Memuat topik…</p>
      ) : topics.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#646970] bg-white border border-[#c3c4c7] rounded shadow-sm">
          Tidak ada topik pada filter ini.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-[#dcdcde] rounded-lg border border-[#c3c4c7] bg-white shadow-sm">
          {topics.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 px-4 py-3 hover:bg-[#fbfbfb]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{t.title}</p>
                    {t.intent ? (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          t.intent.toLowerCase().includes("bofu") || t.intent.toLowerCase().includes("transact")
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            : t.intent.toLowerCase().includes("mofu") || t.intent.toLowerCase().includes("commerc")
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        }`}
                      >
                        {t.intent.toLowerCase().includes("bofu") || t.intent.toLowerCase().includes("transact")
                          ? "BOFU"
                          : t.intent.toLowerCase().includes("mofu") || t.intent.toLowerCase().includes("commerc")
                          ? "MOFU"
                          : "TOFU"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {t.status}
                    {t.primary_keyword ? ` · ${t.primary_keyword}` : ""}
                    {t.source ? ` · ${t.source}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                  {t.status !== "approved" ? (
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() => setStatus(t.id, "approved")}
                      className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      Approve
                    </button>
                  ) : null}
                  {t.status !== "rejected" ? (
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() => setStatus(t.id, "rejected")}
                      className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      Tolak
                    </button>
                  ) : null}
                  {t.status !== "used" ? (
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() => generate(t.id)}
                      className="rounded-md bg-accent px-2.5 py-1 text-accent-fg hover:opacity-90 disabled:opacity-50"
                    >
                      {busyId === t.id ? "…" : "Generate"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => remove(t.id)}
                    className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
