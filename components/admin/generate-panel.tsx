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
          <span className="font-bold text-[#1d2327]">Jumlah ide</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
          />
        </label>
        <button
          type="button"
          onClick={() => run("brainstorm")}
          disabled={busy !== null}
          className="rounded border border-[#2271b1] bg-white text-[#2271b1] px-4 py-2 text-sm font-semibold hover:bg-[#2271b1] hover:text-white transition disabled:opacity-60 shadow-xs"
        >
          {busy === "brainstorm" ? "Mencari Ide…" : "💡 Brainstorm Topik"}
        </button>
        <button
          type="button"
          onClick={() => run("generate")}
          disabled={busy !== null}
          className="rounded bg-[#008a20] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007017] transition disabled:opacity-60 shadow-xs"
        >
          {busy === "generate" ? "Menulis Artikel…" : "⚡ Tulis 1 Artikel Langsung"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 bg-[#fcf0f1] border-l-4 border-[#d63638] p-3 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}

      {result?.kind === "brainstorm" ? (
        <div className="mt-4 bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#1d2327]">
          <p className="font-bold text-[#008a20]">
            ✓ Berhasil: {result.created} topik baru, {result.skipped} duplikat dilewati.
          </p>
          {result.sample.length ? (
            <ul className="mt-2 list-disc pl-5 text-[#50575e]">
              {result.sample.slice(0, 8).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result?.kind === "generate" ? (
        <div className="mt-4 bg-[#edfaef] border-l-4 border-[#008a20] p-3 text-sm text-[#1d2327]">
          <p className="font-bold text-[#008a20]">
            ✓ Artikel dibuat: {result.title} ({result.wordCount} kata,{" "}
            {result.status}).
          </p>
          <a
            href={`/admin/articles`}
            className="mt-1 inline-block text-[#2271b1] font-semibold hover:underline"
          >
            Buka daftar artikel →
          </a>
        </div>
      ) : null}
    </section>
  );
}
