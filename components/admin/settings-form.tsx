"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Settings } from "@/types/db";

type Form = Omit<Settings, "id" | "updated_at">;

const EMPTY: Form = {
  site_name: "",
  site_url: "",
  language: "id",
  ninerouter_url: "",
  ninerouter_key: "",
  model_writer: "",
  model_planner: "",
  embedding_model: "",
  brand_voice: "",
  niche: "",
  audience: "",
  posts_per_run: 3,
  auto_publish: false,
  default_author: "",
  whatsapp_number: "",
  whatsapp_message: "",
};

export default function SettingsForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [hasKey, setHasKey] = useState(false);
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{
          settings: Form;
          hasKey: boolean;
          keyPreview: string | null;
        }>("/api/admin/settings");
        setForm({ ...EMPTY, ...res.settings, ninerouter_key: "" });
        setHasKey(res.hasKey);
        setKeyPreview(res.keyPreview);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.ninerouter_key) delete payload.ninerouter_key;
      const res = await apiSend<{
        settings: Form;
        hasKey: boolean;
        keyPreview: string | null;
      }>("/api/admin/settings", "PUT", payload);
      setForm({ ...EMPTY, ...res.settings, ninerouter_key: "" });
      setHasKey(res.hasKey);
      setKeyPreview(res.keyPreview);
      setNotice("Pengaturan disimpan.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setError(null);
    setNotice(null);
    setModels([]);
    try {
      const res = await apiSend<{
        ok: boolean;
        count: number;
        models: string[];
        reply: string | null;
        error?: string;
      }>("/api/settings/test", "POST", {
        url: form.ninerouter_url,
        key: form.ninerouter_key,
        model: form.model_writer,
        deep: Boolean(form.model_writer),
      });
      if (!res.ok) throw new Error(res.error ?? "Gagal terhubung.");
      setModels(res.models);
      setNotice(
        `Terhubung. ${res.count} model terdeteksi${res.reply ? ` · balasan: ${res.reply}` : ""}.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Memuat…</p>;

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-good">
          {notice}
        </p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold">9Router (AI gateway)</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Endpoint base URL</span>
          <input
            value={form.ninerouter_url ?? ""}
            onChange={(e) => set("ninerouter_url", e.target.value)}
            placeholder="https://router.example.com"
            className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">
            API key{" "}
            {hasKey ? (
              <span className="text-good">({keyPreview} tersimpan)</span>
            ) : null}
          </span>
          <input
            type="password"
            value={form.ninerouter_key ?? ""}
            onChange={(e) => set("ninerouter_key", e.target.value)}
            placeholder={hasKey ? "Biarkan kosong untuk mempertahankan key" : "sk-…"}
            className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Model penulis</span>
            <input
              value={form.model_writer}
              onChange={(e) => set("model_writer", e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Model planner</span>
            <input
              value={form.model_planner}
              onChange={(e) => set("model_planner", e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Model embedding (opsional)</span>
            <input
              value={form.embedding_model ?? ""}
              onChange={(e) => set("embedding_model", e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={test}
            disabled={testing || !form.ninerouter_url}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {testing ? "Menguji…" : "Tes koneksi"}
          </button>
          {models.length ? (
            <select
              onChange={(e) => set("model_writer", e.target.value)}
              defaultValue=""
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Pilih model penulis…
              </option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold">Situs & konten</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Nama situs</span>
            <input
              value={form.site_name ?? ""}
              onChange={(e) => set("site_name", e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">URL situs publik</span>
            <input
              value={form.site_url ?? ""}
              onChange={(e) => set("site_url", e.target.value)}
              placeholder="https://example.com"
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Bahasa</span>
            <input
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Penulis default</span>
            <input
              value={form.default_author ?? ""}
              onChange={(e) => set("default_author", e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Niche</span>
          <input
            value={form.niche ?? ""}
            onChange={(e) => set("niche", e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Audiens</span>
          <input
            value={form.audience ?? ""}
            onChange={(e) => set("audience", e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Brand voice</span>
          <textarea
            rows={3}
            value={form.brand_voice ?? ""}
            onChange={(e) => set("brand_voice", e.target.value)}
            className="resize-y rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Topik per run</span>
            <input
              type="number"
              min={1}
              max={20}
              value={form.posts_per_run}
              onChange={(e) => set("posts_per_run", Number(e.target.value))}
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={form.auto_publish}
              onChange={(e) => set("auto_publish", e.target.checked)}
              className="h-4 w-4"
            />
            <span>Auto-publish artikel hasil generate</span>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line p-5">
        <div>
          <h2 className="text-base font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm text-muted">
            Nomor ini menerima chat dari tombol WhatsApp di situs. Isi dengan
            format apa pun — nomor lokal <code>0812…</code> otomatis diubah ke{" "}
            <code>62812…</code> saat dibuatkan link wa.me.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Nomor WhatsApp bisnis</span>
            <input
              value={form.whatsapp_number ?? ""}
              onChange={(e) => set("whatsapp_number", e.target.value)}
              placeholder="0812 3456 7890"
              inputMode="tel"
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Pesan pembuka (opsional)</span>
            <input
              value={form.whatsapp_message ?? ""}
              onChange={(e) => set("whatsapp_message", e.target.value)}
              placeholder="Halo, saya tertarik dan ingin ngobrol."
              className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
      </div>
    </div>
  );
}
