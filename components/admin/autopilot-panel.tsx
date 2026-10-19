"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";

interface Props {
  count: number;
  disabled: boolean;
  onDone: () => void;
}

/**
 * One-click content engine: brainstorm fresh topics, then immediately write the
 * article for each of them. Everything lands as `draft` so the admin reviews
 * before it reaches page one.
 */
export default function AutopilotPanel({ count, disabled, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(async () => {
      try {
        const res = await apiGet<{ articles: { id: string; title: string; status: string; slug: string }[] }>(
          "/api/admin/articles?status=draft&limit=5",
        );
        setStep(`${res.articles.length} draft menunggu review`);
      } catch {
        // polling is best-effort
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [busy]);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setLog([]);
    setDone(false);

    try {
      const brainstorm = await apiSend<{ created: number; skipped: number; sample: string[] }>(
        "/api/admin/generate",
        "POST",
        { action: "brainstorm", count },
      );
      setLog([
        `✓ Brainstorm: ${brainstorm.created} ide baru, ${brainstorm.skipped} duplikat dilewati.`,
        ...brainstorm.sample.slice(0, 5).map((t) => `  • ${t}`),
      ]);

      const written: string[] = [];
      for (let i = 0; i < count; i++) {
        setStep(`Menulis artikel ${i + 1} dari ${count}…`);
        const res = await apiSend<{ title: string; wordCount: number; status: string }>(
          "/api/admin/generate",
          "POST",
          { action: "generate" },
        );
        written.push(`✓ "${res.title}" — ${res.wordCount} kata (${res.status})`);
        setLog((l) => [...l, written[written.length - 1]]);
      }

      setStep(null);
      setDone(true);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setStep(null);
    } finally {
      setBusy(false);
    }
  }, [count, onDone]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={busy || disabled}
          className="rounded bg-[#008a20] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#007017] disabled:opacity-60"
        >
          {busy ? "⚙️ Sedang jalan…" : "🚀 Jalankan Content Autopilot"}
        </button>
        {disabled ? (
          <span className="text-xs text-[#996800]">
            Lengkapi konfigurasi 9Router di tab Konten &amp; AI terlebih dahulu.
          </span>
        ) : null}
        {!busy && !done ? (
          <span className="text-xs text-[#646970]">
            {count} ide → {count} artikel draft otomatis.
          </span>
        ) : null}
      </div>

      {step ? (
        <div className="rounded border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-xs font-semibold text-[#2271b1]">
          ⏳ {step}
        </div>
      ) : null}

      {log.length ? (
        <ul className="max-h-56 overflow-auto rounded border border-[#dcdcde] bg-white p-3 text-xs text-[#3c434a]">
          {log.map((line, i) => (
            <li key={`${line}-${i}`} className="whitespace-pre-wrap">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      {done ? (
        <div className="rounded border-l-4 border-[#008a20] bg-[#edfaef] px-3 py-2 text-xs font-semibold text-[#00620f]">
          Selesai. Semua artikel masuk status <strong>draft</strong> — review lalu
          klik Publish untuk masuk halaman depan.
        </div>
      ) : null}

      {error ? (
        <div className="rounded border-l-4 border-[#d63638] bg-[#fcf0f1] px-3 py-2 text-xs text-[#3c434a]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
