"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client-api";

type Result =
  | { kind: "brainstorm"; created: number; skipped: number; sample: string[] }
  | { kind: "generate"; title: string; slug: string; wordCount: number; status: string };

export default function GeneratePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState<"brainstorm" | "generate" | null>(null);
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run(action: "brainstorm" | "generate") {
    setBusy(action);
    setError(null);
    setResult(null);
    try {
      if (action === "brainstorm") {
        const res = await apiSend<{ created: number; skipped: number; sample: string[] }>(
          "/api/admin/generate",
          "POST",
          { action, count },
        );
        setResult({ kind: "brainstorm", ...res });
      } else {
        const res = await apiSend<{
          title: string;
          slug: string;
          wordCount: number;
          status: string;
        }>("/api/admin/generate", "POST", { action });
        setResult({ kind: "generate", ...res });
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-line p-5">
      <h2 className="text-base font-semibold tracking-tight">
        Generate konten
      </h2>
      <p className="mt-1 text-sm text-muted">
        Brainstorm membuat ide topik baru. Generate menulis satu artikel
        long-form dari topik yang disetujui.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Jumlah ide</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <button
          type="button"
          onClick={() => run("brainstorm")}
          disabled={busy !== null}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {busy === "brainstorm" ? "Berjalan…" : "Brainstorm topik"}
        </button>
        <button
          type="button"
          onClick={() => run("generate")}
          disabled={busy !== null}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {busy === "generate" ? "Menulis artikel…" : "Generate 1 artikel"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}

      {result?.kind === "brainstorm" ? (
        <div className="mt-4 rounded-md border border-line bg-surface p-3 text-sm">
          <p className="font-medium text-good">
            {result.created} topik baru, {result.skipped} duplikat dilewati.
          </p>
          {result.sample.length ? (
            <ul className="mt-2 list-disc pl-5 text-muted">
              {result.sample.slice(0, 8).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result?.kind === "generate" ? (
        <div className="mt-4 rounded-md border border-line bg-surface p-3 text-sm">
          <p className="font-medium text-good">
            Artikel dibuat: {result.title} ({result.wordCount} kata,{" "}
            {result.status}).
          </p>
          <a
            href={`/admin/articles`}
            className="mt-1 inline-block text-accent hover:underline"
          >
            Buka daftar artikel →
          </a>
        </div>
      ) : null}
    </section>
  );
}
