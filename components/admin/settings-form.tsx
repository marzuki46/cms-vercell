"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Settings, HomeCopyLocale, AuthorProfile } from "@/types/db";

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
  home_copy: null,
  author_profile: null,
};

const FIELD =
  "rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-2 outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] w-full";
const LABEL = "text-[#50575e] font-semibold text-xs uppercase tracking-wide";

const TABS = [
  { id: "general", label: "Umum", icon: "🌐" },
  { id: "homepage", label: "Teks Beranda (Home Copy)", icon: "🏠" },
  { id: "author", label: "Profil Penulis (E-E-A-T)", icon: "✍️" },
  { id: "content", label: "Konten & AI", icon: "🤖" },
  { id: "seo", label: "SEO & Search", icon: "🔍" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "system", label: "Sistem & Database", icon: "🛠️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsForm() {
  const [tab, setTab] = useState<TabId>("general");
  const [homeCopyLang, setHomeCopyLang] = useState<"id" | "en">("id");
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
  const [uploadedHtmlFile, setUploadedHtmlFile] = useState<string | null>(null);
  const [testHtmlFile, setTestHtmlFile] = useState<string>("");
  const [testStatus, setTestStatus] = useState<string | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedHtmlFile(file.name);
    setTestHtmlFile(file.name);
    checkFileVerification(file.name);
  }

  async function checkFileVerification(filename: string) {
    if (!filename) return;
    const clean = filename.trim().startsWith("/") ? filename.trim() : `/${filename.trim()}`;
    setTestStatus("Memeriksa...");
    try {
      const res = await fetch(clean);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("google-site-verification")) {
          setTestStatus(`✅ Sukses! URL ${clean} aktif & merespon:\n"${text.trim()}"\nSiap diverifikasi di Google Search Console!`);
        } else {
          setTestStatus(`⚠️ URL merespon HTTP ${res.status}, namun konten berbeda: "${text.slice(0, 80)}"`);
        }
      } else {
        setTestStatus(`❌ Gagal: URL ${clean} merespon status HTTP ${res.status}`);
      }
    } catch {
      setTestStatus("❌ Gagal menghubungi URL.");
    }
  }

  function handleTagInput(val: string) {
    const match = val.match(/content=["']([^"']+)["']/i);
    const token = match ? match[1].trim() : val.trim();
    set("google_site_verification", token);
  }

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

  function getCopyField(field: keyof HomeCopyLocale): string {
    return form.home_copy?.[homeCopyLang]?.[field] ?? "";
  }

  function setCopyField(field: keyof HomeCopyLocale, value: string) {
    setForm((f) => ({
      ...f,
      home_copy: {
        ...f.home_copy,
        [homeCopyLang]: {
          ...(f.home_copy?.[homeCopyLang] ?? {}),
          [field]: value,
        },
      },
    }));
  }

  function updateAuthorProfile<K extends keyof AuthorProfile>(
    field: K,
    value: AuthorProfile[K],
  ) {
    setForm((f) => ({
      ...f,
      author_profile: {
        ...(f.author_profile ?? {}),
        [field]: value,
      },
    }));
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

        {tab === "homepage" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#dcdcde] gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1d2327]">Kustomisasi Kata-Kata Beranda</h2>
                <p className="text-xs text-[#646970]">
                  Ubah seluruh teks judul, subjudul, tombol, dan pilar keunggulan yang tampil di halaman depan website Anda.
                </p>
              </div>

              {/* Locale Selector */}
              <div className="flex items-center gap-1.5 bg-[#f0f0f1] p-1 rounded border border-[#dcdcde]">
                <button
                  type="button"
                  onClick={() => setHomeCopyLang("id")}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                    homeCopyLang === "id"
                      ? "bg-white text-[#2271b1] shadow-sm"
                      : "text-[#50575e] hover:text-[#1d2327]"
                  }`}
                >
                  🇮🇩 Versi Indonesia (/id)
                </button>
                <button
                  type="button"
                  onClick={() => setHomeCopyLang("en")}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                    homeCopyLang === "en"
                      ? "bg-white text-[#2271b1] shadow-sm"
                      : "text-[#50575e] hover:text-[#1d2327]"
                  }`}
                >
                  🇬🇧 Versi English (/en)
                </button>
              </div>
            </div>

            {/* Section 0: Home SEO (Meta Title & Meta Description) */}
            <div className="bg-[#f0f6fc] p-4 rounded-lg border border-[#2271b1]/30 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🔍</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                  0. Pengaturan SEO Beranda (Meta Title &amp; Description di Google)
                </span>
              </div>
              <p className="text-xs text-[#50575e]">
                {homeCopyLang === "id"
                  ? "Teks ini yang akan tampil di hasil pencarian Google dan tab browser untuk halaman https://masboss.vercel.app/id"
                  : "This text will appear in Google search engine snippets and browser tabs for https://masboss.vercel.app/en"}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>Meta Title Beranda</span>
                  <input
                    value={getCopyField("meta_title")}
                    onChange={(e) => setCopyField("meta_title", e.target.value)}
                    placeholder={
                      homeCopyLang === "id"
                        ? "Dealer Resmi Motor Honda Solo - Promo DP Ringan & Angsuran Termurah"
                        : "Official Honda Dealer Solo - Best Discounts & Flexible Financing"
                    }
                    className={FIELD}
                  />
                  <span className="text-[11px] text-[#646970]">
                    Rekomendasi panjang: 50–60 karakter. Karakter saat ini: {getCopyField("meta_title").length}
                  </span>
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>Meta Description Beranda</span>
                  <textarea
                    rows={2}
                    value={getCopyField("meta_description")}
                    onChange={(e) => setCopyField("meta_description", e.target.value)}
                    placeholder={
                      homeCopyLang === "id"
                        ? "Pusat informasi promo motor Honda Solo terbaru, simulasi kredit DP minim, diskon cash, dan layanan sales resmi terpercaya."
                        : "Official information hub for exclusive Honda motorcycle promotions, credit simulations, and direct certified sales consultants in Solo."
                    }
                    className={FIELD}
                  />
                  <span className="text-[11px] text-[#646970]">
                    Rekomendasi panjang: 120–160 karakter. Karakter saat ini: {getCopyField("meta_description").length}
                  </span>
                </label>
              </div>
            </div>

            {/* Section 1: Hero Section */}
            <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e4e7ec] flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                1. Bagian Hero (Headline Utama)
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Badge Atas (Pill Text)</span>
                  <input
                    value={getCopyField("hero_badge")}
                    onChange={(e) => setCopyField("hero_badge", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Portal Pengetahuan & Wawasan Resmi" : "Official Publication Portal"}
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Label Tombol Jelajahi (Primary Button)</span>
                  <input
                    value={getCopyField("explore_button")}
                    onChange={(e) => setCopyField("explore_button", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Jelajahi Semua Artikel" : "Explore All Articles"}
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>Judul Utama Hero (H1)</span>
                  <input
                    value={getCopyField("hero_title")}
                    onChange={(e) => setCopyField("hero_title", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Informasi Terpercaya & Panduan Mendalam dari..." : "Insights & Comprehensive Guides by..."}
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>Deskripsi Sambutan Hero</span>
                  <textarea
                    rows={3}
                    value={getCopyField("hero_subtitle")}
                    onChange={(e) => setCopyField("hero_subtitle", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Selamat datang di website kami..." : "Welcome to our publication..."}
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Label Tombol Chat WhatsApp</span>
                  <input
                    value={getCopyField("chat_button")}
                    onChange={(e) => setCopyField("chat_button", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Konsultasi Cepat via WhatsApp" : "Chat via WhatsApp"}
                    className={FIELD}
                  />
                </label>
              </div>
            </div>

            {/* Section 2: Why Choose Us / Pillars */}
            <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e4e7ec] flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                2. Bagian Keunggulan &amp; Nilai Tambah (Why Choose Us)
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Judul Bagian Keunggulan (Why Title)</span>
                  <input
                    value={getCopyField("why_title")}
                    onChange={(e) => setCopyField("why_title", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Kenapa Membaca di Sini?" : "Why Read on Our Site?"}
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Subjudul Bagian Keunggulan</span>
                  <input
                    value={getCopyField("why_subtitle")}
                    onChange={(e) => setCopyField("why_subtitle", e.target.value)}
                    placeholder="Standar kualitas dan komitmen editorial kami..."
                    className={FIELD}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                {/* Pilar 1 */}
                <div className="bg-white p-3 rounded border border-[#dcdcde] flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#1d2327]">Pilar 1 (📚)</span>
                  <input
                    value={getCopyField("pillar1_title")}
                    onChange={(e) => setCopyField("pillar1_title", e.target.value)}
                    placeholder="Judul Pilar 1"
                    className="text-xs font-semibold px-2.5 py-1.5 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1]"
                  />
                  <textarea
                    rows={2}
                    value={getCopyField("pillar1_desc")}
                    onChange={(e) => setCopyField("pillar1_desc", e.target.value)}
                    placeholder="Penjelasan pilar 1..."
                    className="text-xs px-2.5 py-1.5 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1]"
                  />
                </div>

                {/* Pilar 2 */}
                <div className="bg-white p-3 rounded border border-[#dcdcde] flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#1d2327]">Pilar 2 (🎯)</span>
                  <input
                    value={getCopyField("pillar2_title")}
                    onChange={(e) => setCopyField("pillar2_title", e.target.value)}
                    placeholder="Judul Pilar 2"
                    className="text-xs font-semibold px-2.5 py-1.5 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1]"
                  />
                  <textarea
                    rows={2}
                    value={getCopyField("pillar2_desc")}
                    onChange={(e) => setCopyField("pillar2_desc", e.target.value)}
                    placeholder="Penjelasan pilar 2..."
                    className="text-xs px-2.5 py-1.5 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1]"
                  />
                </div>

                {/* Pilar 3 */}
                <div className="bg-white p-3 rounded border border-[#dcdcde] flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#1d2327]">Pilar 3 (⚡)</span>
                  <input
                    value={getCopyField("pillar3_title")}
                    onChange={(e) => setCopyField("pillar3_title", e.target.value)}
                    placeholder="Judul Pilar 3"
                    className="text-xs font-semibold px-2.5 py-1.5 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1]"
                  />
                  <textarea
                    rows={2}
                    value={getCopyField("pillar3_desc")}
                    onChange={(e) => setCopyField("pillar3_desc", e.target.value)}
                    placeholder="Penjelasan pilar 3..."
                    className="text-xs px-2.5 py-1.5 border border-[#8c8f94] rounded outline-none focus:border-[#2271b1]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Bottom Call-To-Action Banner */}
            <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e4e7ec] flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                3. Banner Ajakan Bertindak Bawah (Bottom CTA)
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Judul Banner CTA</span>
                  <input
                    value={getCopyField("cta_title")}
                    onChange={(e) => setCopyField("cta_title", e.target.value)}
                    placeholder={homeCopyLang === "id" ? "Ada Pertanyaan atau Mau Konsultasi?" : "Questions or Inquiries?"}
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Subjudul / Deskripsi Banner CTA</span>
                  <input
                    value={getCopyField("cta_subtitle")}
                    onChange={(e) => setCopyField("cta_subtitle", e.target.value)}
                    placeholder="Tim kami siap membantu menjawab pertanyaan Anda..."
                    className={FIELD}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "author" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#dcdcde] gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1d2327]">Pengaturan Profil Penulis &amp; E-E-A-T</h2>
                <p className="text-xs text-[#646970]">
                  Kelola data profil penulis resmi yang tampil di halaman profil <code>/id/author/admin</code> serta kotak penulis (Author Box) di setiap artikel.
                </p>
              </div>

              <a
                href="/id/author/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border border-[#2271b1] text-[#2271b1] bg-[#2271b1]/5 hover:bg-[#2271b1]/10 transition"
              >
                <span>Lihat Profil Publik (/id/author/admin)</span>
                <span>↗</span>
              </a>
            </div>

            {/* Bagian 1: Data Identitas Penulis */}
            <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e4e7ec] flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                1. Identitas &amp; Biografi Penulis
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Nama Lengkap Penulis</span>
                  <input
                    value={form.author_profile?.name ?? form.default_author ?? ""}
                    onChange={(e) => {
                      updateAuthorProfile("name", e.target.value);
                      set("default_author", e.target.value);
                    }}
                    placeholder="Contoh: Budi Santoso / Tim Redaksi"
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Jabatan / Gelar / Keahlian (Role)</span>
                  <input
                    value={form.author_profile?.role ?? ""}
                    onChange={(e) => updateAuthorProfile("role", e.target.value)}
                    placeholder="Contoh: Sales Consultant Resmi & Penulis Otomotif"
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>URL Foto Profil / Avatar (Opsional)</span>
                  <input
                    value={form.author_profile?.avatar_url ?? ""}
                    onChange={(e) => updateAuthorProfile("avatar_url", e.target.value)}
                    placeholder="https://images.unsplash.com/... atau URL foto Anda (kosongkan untuk inisial nama)"
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>Biografi Singkat (Bio)</span>
                  <textarea
                    rows={3}
                    value={form.author_profile?.bio ?? ""}
                    onChange={(e) => updateAuthorProfile("bio", e.target.value)}
                    placeholder="Tuliskan pengalaman, dedikasi, atau latar belakang profesional Anda untuk meningkatkan kredibilitas di mata pembaca dan Google E-E-A-T..."
                    className={FIELD}
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={LABEL}>Sertifikasi &amp; Keahlian E-E-A-T (Pisahkan dengan tanda koma)</span>
                  <input
                    value={(form.author_profile?.credentials ?? []).join(", ")}
                    onChange={(e) => {
                      const list = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      updateAuthorProfile("credentials", list);
                    }}
                    placeholder="Contoh: Verified Content Creator, Konsultan Resmi Solo, Ahli Finansial Otomotif"
                    className={FIELD}
                  />
                  <span className="text-[11px] text-[#646970]">
                    Badge ini akan ditampilkan dengan ikon medali 🏅 di halaman profil dan kotak artikel.
                  </span>
                </label>
              </div>
            </div>

            {/* Bagian 2: Pengaturan Kotak Penulis di Halaman Artikel */}
            <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e4e7ec] flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                2. Tampilan Kotak Penulis di Setiap Artikel (Author Box)
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Posisi Kotak Penulis di Artikel</span>
                  <select
                    value={form.author_profile?.author_box_position ?? "bottom"}
                    onChange={(e) =>
                      updateAuthorProfile(
                        "author_box_position",
                        e.target.value as "bottom" | "top" | "both" | "none",
                      )
                    }
                    className={FIELD}
                  >
                    <option value="bottom">Di Bawah Konten Artikel (Rekomendasi Standar)</option>
                    <option value="top">Di Atas Konten Artikel (Di Bawah Judul)</option>
                    <option value="both">Di Atas &amp; Di Bawah Konten Sekaligus</option>
                    <option value="none">Nonaktifkan (Jangan Tampilkan)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Judul Kotak Penulis</span>
                  <input
                    value={form.author_profile?.author_box_title ?? ""}
                    onChange={(e) => updateAuthorProfile("author_box_title", e.target.value)}
                    placeholder="Default: Ditulis &amp; Diverifikasi Oleh"
                    className={FIELD}
                  />
                </label>
              </div>
            </div>

            {/* Bagian 3: Preview Tampilan Langsung */}
            <div className="bg-white p-4 rounded-lg border border-[#c3c4c7] flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1d2327]">
                Preview Kotak Penulis di Artikel:
              </span>

              <div className="rounded-xl border border-line bg-[#fbfbfd] p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start">
                <div className="h-14 w-14 rounded-full bg-[#2271b1] text-white flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 shadow-sm">
                  {form.author_profile?.avatar_url ? (
                    <img
                      src={form.author_profile.avatar_url}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{(form.author_profile?.name || form.default_author || "A").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2271b1]">
                      {form.author_profile?.author_box_title || "Ditulis & Diverifikasi Oleh"}
                    </span>
                    <span className="text-[10px] font-bold text-[#008a20] bg-[#edfaef] px-2 py-0.5 rounded-full">
                      ✓ Verified E-E-A-T
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#1d2327] mt-0.5">
                    {form.author_profile?.name || form.default_author || "Admin Editorial"}
                  </h4>
                  <p className="text-xs font-semibold text-[#50575e]">
                    {form.author_profile?.role || "Tim Riset & Editor Publikasi"}
                  </p>
                  <p className="text-xs text-[#50575e] mt-1.5 leading-relaxed line-clamp-2">
                    {form.author_profile?.bio ||
                      "Tim editorial dan penulis resmi berdedikasi menyajikan ulasan dan panduan terpercaya."}
                  </p>
                  {form.author_profile?.credentials && form.author_profile.credentials.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {form.author_profile.credentials.map((c) => (
                        <span key={c} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                          🏅 {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
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
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-base font-bold text-[#1d2327]">
                Verifikasi Google Search Console & Mesin Pencari
              </h2>
              <p className="text-xs text-[#646970] mt-0.5">
                Pilih salah satu metode verifikasi di bawah ini untuk menghubungkan situs Anda ke Google Search Console.
              </p>
            </div>

            {/* Metode 1: File HTML (Paling Mudah & Instan) */}
            <div className="rounded-lg border border-[#c3c4c7] bg-white p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2271b1] text-xs font-bold text-white">
                  1
                </span>
                <h3 className="text-sm font-bold text-[#1d2327]">
                  Metode File HTML (Rekomendasi - Otomatis & Instan)
                </h3>
              </div>

              <div className="rounded-md border border-[#cce5ff] bg-[#f0f7ff] p-3 text-xs leading-relaxed text-[#004085]">
                💡 <strong>Cara kerja otomatis:</strong> Server Edge kami sudah dikonfigurasi untuk langsung merespon permintaan verifikasi file Google apa pun (misal: <code>google1234567890abcdef.html</code>) secara otomatis dengan status <strong>200 OK</strong> dan konten yang valid. Anda <strong>tidak perlu mengunggah file manual ke hosting</strong>!
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#50575e]">
                  Langkah verifikasi dengan File HTML:
                </p>
                <ol className="list-decimal space-y-1.5 pl-5 text-xs text-[#50575e]">
                  <li>Di Google Search Console, pilih metode <strong>HTML file</strong>.</li>
                  <li>Unduh atau catat nama filenya (misalnya: <code>google4b8c9d2e1f0a.html</code>).</li>
                  <li>Pilih file yang Anda unduh di bawah ini (atau ketik nama filenya) untuk menguji responnya:</li>
                </ol>

                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <label className="cursor-pointer rounded border border-dashed border-[#8c8f94] bg-[#f6f7f7] px-4 py-2.5 text-center text-xs font-semibold text-[#1d2327] hover:border-[#2271b1] hover:bg-[#edf2f7] transition">
                    📁 Pilih File .html dari Komputer
                    <input
                      type="file"
                      accept=".html"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={testHtmlFile}
                      onChange={(e) => setTestHtmlFile(e.target.value)}
                      placeholder="atau ketik nama file: google1234567890abcdef.html"
                      className={FIELD}
                    />
                    <button
                      type="button"
                      onClick={() => checkFileVerification(testHtmlFile)}
                      className="shrink-0 rounded bg-[#2271b1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#135e96] transition"
                    >
                      Tes URL
                    </button>
                  </div>
                </div>

                {uploadedHtmlFile ? (
                  <p className="text-xs font-medium text-[#008a20]">
                    ✓ File terdeteksi: <code>{uploadedHtmlFile}</code>
                  </p>
                ) : null}

                {testStatus ? (
                  <div className="rounded border border-[#dcdcde] bg-[#f6f7f7] p-3 font-mono text-xs whitespace-pre-wrap">
                    {testStatus}
                  </div>
                ) : null}

                <div className="text-xs text-[#646970] mt-1">
                  Setelah tombol tes menunjukkan status sukses (✅), kembali ke Google Search Console dan klik tombol <strong>VERIFIKASI</strong>.
                </div>
              </div>
            </div>

            {/* Metode 2: Meta Tag HTML */}
            <div className="rounded-lg border border-[#c3c4c7] bg-white p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#50575e] text-xs font-bold text-white">
                  2
                </span>
                <h3 className="text-sm font-bold text-[#1d2327]">
                  Metode Tag HTML (Meta Tag)
                </h3>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Kode Verifikasi atau Tag Meta Lengkap</span>
                <input
                  value={form.google_site_verification ?? ""}
                  onChange={(e) => handleTagInput(e.target.value)}
                  placeholder="Tempel kode token atau tag <meta name='google-site-verification' content='...' />"
                  className={FIELD}
                />
                <span className="text-xs text-[#646970]">
                  Anda bisa menempelkan kode token saja (mis. <code>AbCdEf123456...</code>) atau seluruh tag <code>&lt;meta ...&gt;</code>, sistem akan mengekstraknya secara otomatis. Jangan lupa klik &quot;Simpan Pengaturan&quot; di bawah setelah mengisi.
                </span>
              </label>
            </div>

            {/* Otomasi SEO Lainnya */}
            <div className="rounded-lg border border-[#dcdcde] bg-[#f6f7f7] p-4">
              <h3 className="text-sm font-bold text-[#1d2327]">Fitur SEO yang Sudah Berjalan Otomatis</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#50575e]">
                <li>Sitemap XML dinamis dengan hreflang ID/EN: <code>/sitemap.xml</code></li>
                <li>Verifikasi Bing Webmaster: <code>/BingSiteAuth.xml</code></li>
                <li>robots.txt dengan allowlist bot AI (GPTBot, ClaudeBot, PerplexityBot): <code>/robots.txt</code></li>
                <li>RSS Feed artikel: <code>/rss.xml</code></li>
                <li>OpenGraph, Twitter Card &amp; gambar sosial otomatis 1200x630</li>
                <li>Schema JSON-LD: <code>BlogPosting</code>, <code>BreadcrumbList</code>, <code>Person</code> (E-E-A-T), <code>CollectionPage</code></li>
                <li>Pengalihan otomatis 301 untuk slug lama dan canonical tags</li>
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
