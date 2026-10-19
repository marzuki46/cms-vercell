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
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5 text-sm">
          <span className="text-muted">Judul topik manual</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Panduan lengkap optimasi Core Web Vitals"
            className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Kata kunci utama</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-48 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
        >
          Tambah topik
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setLoading(true);
              setTab(t.value);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              tab === t.value
                ? "border-accent bg-accent text-accent-fg"
                : "border-line text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : topics.length === 0 ? (
        <p className="text-sm text-muted">Tidak ada topik pada filter ini.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {topics.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{t.title}</p>
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
