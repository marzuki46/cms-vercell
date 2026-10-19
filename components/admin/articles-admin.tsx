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
  published_at: string | null;
  scheduled_for: string | null;
  word_count: number | null;
  reading_time_minutes: number | null;
  author: string | null;
  created_at: string;
}

const TABS: { value: ArticleStatus | "all"; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "published", label: "Terbit" },
  { value: "archived", label: "Arsip" },
  { value: "all", label: "Semua" },
];

export default function ArticlesAdmin() {
  const [tab, setTab] = useState<ArticleStatus | "all">("draft");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleInto, setScheduleInto] = useState<Record<string, string>>({});

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
    <div className="flex flex-col gap-6">
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
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Tidak ada artikel pada filter ini.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.status}
                    {a.word_count ? ` · ${a.word_count} kata` : ""}
                    {a.reading_time_minutes
                      ? ` · ${a.reading_time_minutes} menit`
                      : ""}
                    {a.author ? ` · ${a.author}` : ""}
                  </p>
                </div>
                {a.status === "published" ? (
                  <Link
                    href={`/blog/${a.slug}`}
                    target="_blank"
                    className="text-xs text-accent hover:underline"
                  >
                    Lihat publik ↗
                  </Link>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {a.status === "draft" ? (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => patch(a.id, { status: "published" })}
                    className="rounded-md bg-accent px-2.5 py-1 text-accent-fg hover:opacity-90 disabled:opacity-50"
                  >
                    Publish sekarang
                  </button>
                ) : null}
                {a.status === "published" ? (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => patch(a.id, { status: "draft" })}
                    className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Tarik ke draft
                  </button>
                ) : null}
                {a.status === "archived" ? (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => patch(a.id, { status: "draft" })}
                    className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Pulihkan
                  </button>
                ) : null}
                {a.status !== "archived" ? (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => patch(a.id, { status: "archived" })}
                    className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Arsipkan
                  </button>
                ) : null}

                <span className="ml-1 flex items-center gap-1">
                  <input
                    type="datetime-local"
                    value={scheduleInto[a.id] ?? ""}
                    onChange={(e) =>
                      setScheduleInto((s) => ({ ...s, [a.id]: e.target.value }))
                    }
                    className="rounded-md border border-line bg-surface px-2 py-1"
                  />
                  <button
                    type="button"
                    disabled={busyId === a.id || !scheduleInto[a.id]}
                    onClick={() =>
                      patch(a.id, {
                        status: "scheduled",
                        scheduled_for: new Date(
                          scheduleInto[a.id],
                        ).toISOString(),
                      })
                    }
                    className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Jadwalkan
                  </button>
                </span>
                {a.status === "scheduled" && a.scheduled_for ? (
                  <span className="text-muted">
                    → {new Date(a.scheduled_for).toLocaleString("id-ID")}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
