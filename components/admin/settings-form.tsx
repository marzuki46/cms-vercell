"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Settings } from "@/types/db";

type Form = Omit<Settings, "id" | "updated_at">;

const EMPTY: Form = {
  site_name: "",
  site_url: "",
  language: "id",
  theme_template: "modern",
  google_site_verification: "",
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

const FIELD =
  "rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] w-full";
const LABEL = "text-[#50575e] font-semibold text-xs uppercase tracking-wide";

const TABS = [
  { id: "general", label: "Umum", icon: "🌐" },
  { id: "content", label: "Konten & AI", icon: "🤖" },
  { id: "seo", label: "SEO & Search", icon: "🔍" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "system", label: "Sistem & Database", icon: "🛠️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsForm() {
  const [tab, setTab] = useState<TabId>("general");
  const [form, setForm] = useState<Form>(EMPTY);
  const [hasKey, setHasKey] = useState(false);
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [repair, setRepair] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{
          settings: Form;
          hasKey: boolean;
          keyPreview: string | null;
          missingColumns?: string[];
          repairSql?: string;
        }>("/api/admin/settings");
        setForm({ ...EMPTY, ...res.settings, ninerouter_key: "" });
        setHasKey(res.hasKey);
        setKeyPreview(res.keyPreview);
        setMissing(res.missingColumns ?? []);
        setRepair(res.repairSql ?? "");
        if (res.missingColumns?.length) setTab("system");
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
      setNotice("Pengaturan berhasil disimpan.");
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

  if (loading) return <p className="text-sm text-[#646970]">Memuat pengaturan…</p>;

  return (
    <div className="flex flex-col gap-5">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-[#c3c4c7]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm transition ${
              tab === t.id
                ? "border-[#c3c4c7] border-t-2 border-t-[#2271b1] bg-white font-bold text-[#2271b1]"
                : "border-transparent font-medium text-[#50575e] hover:text-[#2271b1]"
            }`}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded border-l-4 border-[#d63638] bg-[#fcf0f1] px-3 py-2 text-sm text-[#3c434a]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded border-l-4 border-[#008a20] bg-[#edfaef] px-3 py-2 text-sm text-[#00620f]">
          {notice}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#c3c4c7] bg-white p-5 shadow-sm">
        {tab === "general" ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-[#1d2327]">Identitas Situs</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Nama situs</span>
                <input
                  value={form.site_name ?? ""}
                  onChange={(e) => set("site_name", e.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>URL situs publik</span>
                <input
                  value={form.site_url ?? ""}
                  onChange={(e) => set("site_url", e.target.value)}
                  placeholder="https://example.com"
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Bahasa utama konten</span>
                <select
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className={FIELD}
                >
                  <option value="id">Bahasa Indonesia (id)</option>
                  <option value="en">English (en)</option>
                </select>
                <span className="text-xs text-[#646970]">
                  Mengubah ke English akan menulis seluruh halaman publik dan prompt AI
                  dalam bahasa Inggris.
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Template tampilan publik</span>
                <select
                  value={form.theme_template ?? "modern"}
                  onChange={(e) => set("theme_template", e.target.value as NonNullable<Form["theme_template"]>)}
                  className={FIELD}
                >
                  <option value="modern">Modern Professional (SaaS)</option>
                  <option value="editorial">Editorial Warm (Majalah)</option>
                  <option value="minimal">Minimal Clean (Super Ringan)</option>
                </select>
                <span className="text-xs text-[#646970]">
                  Semua template responsif penuh (mobile, tablet, desktop).
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Penulis default</span>
                <input
                  value={form.default_author ?? ""}
                  onChange={(e) => set("default_author", e.target.value)}
                  className={FIELD}
                />
              </label>
            </div>
          </div>
        ) : null}

        {tab === "content" ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4 border-b border-[#dcdcde] pb-6">
              <div>
                <h2 className="text-base font-bold text-[#1d2327]">
                  9Router (AI Gateway)
                </h2>
                <p className="text-xs text-[#646970]">
                  Semua kunci API disimpan di database, bukan di environment variable.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Endpoint base URL</span>
                  <input
                    value={form.ninerouter_url ?? ""}
                    onChange={(e) => set("ninerouter_url", e.target.value)}
                    placeholder="https://router.example.com"
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>
                    API key{" "}
                    {hasKey ? (
                      <span className="text-[#008a20]">({keyPreview} tersimpan)</span>
                    ) : null}
                  </span>
                  <input
                    type="password"
                    value={form.ninerouter_key ?? ""}
                    onChange={(e) => set("ninerouter_key", e.target.value)}
                    placeholder={hasKey ? "Kosongkan untuk mempertahankan key" : "sk-…"}
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Model penulis</span>
                  <input
                    value={form.model_writer}
                    onChange={(e) => set("model_writer", e.target.value)}
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Model planner</span>
                  <input
                    value={form.model_planner}
                    onChange={(e) => set("model_planner", e.target.value)}
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Model embedding (opsional)</span>
                  <input
                    value={form.embedding_model ?? ""}
                    onChange={(e) => set("embedding_model", e.target.value)}
                    className={FIELD}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={test}
                  disabled={testing || !form.ninerouter_url}
                  className="rounded border border-[#2271b1] px-4 py-2 text-sm font-semibold text-[#2271b1] transition hover:bg-[#2271b1] hover:text-white disabled:opacity-60"
                >
                  {testing ? "Menguji…" : "Tes koneksi"}
                </button>
                {models.length ? (
                  <select
                    onChange={(e) => set("model_writer", e.target.value)}
                    defaultValue=""
                    className="rounded border border-[#8c8f94] bg-white px-3 py-2 text-sm text-[#1d2327] outline-none focus:border-[#2271b1]"
                  >
                    <option value="" disabled>
                      Pilih model ({models.length} tersedia)…
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

            <section className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-[#1d2327]">Konteks Konten (Multi Niche)</h2>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Niche / industri</span>
                <input
                  value={form.niche ?? ""}
                  onChange={(e) => set("niche", e.target.value)}
                  placeholder="mis. Otomotif, properti, keuangan, kesehatan,Immutable …"
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Target audiens</span>
                <input
                  value={form.audience ?? ""}
                  onChange={(e) => set("audience", e.target.value)}
                  placeholder="mis. pemilik usaha di Solo Raya, usia 25–45"
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Brand voice</span>
                <textarea
                  rows={4}
                  value={form.brand_voice ?? ""}
                  onChange={(e) => set("brand_voice", e.target.value)}
                  placeholder="mis. Santai tapi informatif, hindari jargon teknis, gunakan analogi sehari-hari."
                  className={`${FIELD} resize-y`}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Jumlah topik per run AI</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.posts_per_run}
                    onChange={(e) => set("posts_per_run", Number(e.target.value))}
                    className={FIELD}
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-[#1d2327]">
                  <input
                    type="checkbox"
                    checked={form.auto_publish}
                    onChange={(e) => set("auto_publish", e.target.checked)}
                    className="h-4 w-4 rounded text-[#2271b1]"
                  />
                  Auto-publish artikel hasil generate
                </label>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold text-[#1d2327]">
                Google Search Console
              </h2>
              <p className="text-xs text-[#646970]">
                Tempel kode verifikasi dari Google Search Console (metode HTML Tag).
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Kode verifikasi (HTML Tag)</span>
              <input
                value={form.google_site_verification ?? ""}
                onChange={(e) => set("google_site_verification", e.target.value)}
                placeholder="mis. AbCdEf1234567890abcdef..."
                className={FIELD}
              />
              <span className="text-xs text-[#646970]">
                Salin hanya isi atribut <code>content=&quot;...&quot;</code> dari tag
                meta google-site-verification.
              </span>
            </label>

            <div className="rounded-lg border border-[#dcdcde] bg-[#f6f7f7] p-4">
              <h3 className="text-sm font-bold text-[#1d2327]">Yang sudah otomatis</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#50575e]">
                <li>Sitemap XML dinamis: <code>/sitemap.xml</code></li>
                <li>robots.txt dengan allowlist bot AI</li>
                <li>RSS feed: <code>/rss.xml</code></li>
                <li>OpenGraph + Twitter Card + OG image 1200x630</li>
                <li>JSON-LD: BlogPosting, BreadcrumbList, WebSite, Organization</li>
                <li>Canonical URL &amp; meta robots max-snippet/-image</li>
              </ul>
            </div>
          </div>
        ) : null}

        {tab === "whatsapp" ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-[#1d2327]">WhatsApp Lead Capture</h2>
              <p className="text-xs text-[#646970]">
                Lead tersimpan di database sebelum pengunjung diarahkan ke WhatsApp.
                Format lokal <code>0812…</code> otomatis menjadi <code>62812…</code>.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Nomor WhatsApp bisnis</span>
                <input
                  value={form.whatsapp_number ?? ""}
                  onChange={(e) => set("whatsapp_number", e.target.value)}
                  placeholder="0812 3456 7890"
                  inputMode="tel"
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Pesan pembuka (opsional)</span>
                <input
                  value={form.whatsapp_message ?? ""}
                  onChange={(e) => set("whatsapp_message", e.target.value)}
                  placeholder="Halo, saya tertarik dan ingin ngobrol."
                  className={FIELD}
                />
              </label>
            </div>
            <p className="rounded border border-[#dcdcde] bg-[#f6f7f7] p-3 text-xs text-[#50575e]">
              Widget WhatsApp mengambang sudah terpasang otomatis di seluruh halaman publik.
            </p>
          </div>
        ) : null}

        {tab === "system" ? (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold text-[#1d2327]">Status Database</h2>
              <p className="text-xs text-[#646970]">
                Deteksi otomatis kolom yang belum ada di tabel <code>public.settings</code>.
              </p>
            </div>

            {missing.length === 0 ? (
              <div className="rounded border-l-4 border-[#008a20] bg-[#edfaef] px-3 py-2 text-sm text-[#00620f]">
                ✓ Semua kolom sudah lengkap. Database siap digunakan tanpa tindakan
                manual.
              </div>
            ) : (
              <div className="rounded border-l-4 border-[#d63638] bg-[#fcf0f1] px-3 py-2 text-sm text-[#3c434a]">
                <p className="font-bold">Kolom belum ada: {missing.join(", ")}</p>
                <p className="mt-1 text-xs">
                  Salin SQL di bawah, tempel ke Supabase → SQL Editor → Run, lalu muat
                  ulang halaman ini.
                </p>
              </div>
            )}

            {repair ? (
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>SQL perbaikan</span>
                <textarea
                  readOnly
                  rows={repair.split("\n").length + 1}
                  value={repair}
                  onFocus={(e) => e.currentTarget.select()}
                  className={`${FIELD} resize-y font-mono text-xs`}
                />
                <span className="text-xs text-[#646970]">
                  Klik kolom di atas untuk menyalin seluruh isinya.
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-[#2271b1] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#135e96] disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Simpan Pengaturan"}
        </button>
      </div>
    </div>
  );
}
