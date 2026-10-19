"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { LeadStatus, WhatsAppLead } from "@/types/db";

const TABS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "new", label: "Baru" },
  { value: "contacted", label: "Dihubungi" },
  { value: "closed", label: "Selesai" },
  { value: "all", label: "Semua" },
];

const STATUSES: LeadStatus[] = ["new", "contacted", "closed"];

function waChatLink(digits: string, text: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function fmt(value: string) {
  try {
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function LeadsAdmin() {
  const [tab, setTab] = useState<LeadStatus | "all">("new");
  const [leads, setLeads] = useState<WhatsAppLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const q = tab === "all" ? "" : `?status=${tab}`;
        const res = await apiGet<{ leads: WhatsAppLead[] }>(`/api/admin/leads${q}`);
        if (active) {
          setLeads(res.leads);
          setNotes(
            Object.fromEntries(res.leads.map((l) => [l.id, l.note ?? ""])),
          );
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
  }, [tab]);

  async function patch(
    id: string,
    body: Record<string, unknown>,
    keepLoading = false,
  ) {
    setBusyId(id);
    setError(null);
    if (!keepLoading) setLoading(true);
    try {
      await apiSend(`/api/admin/leads/${id}`, "PATCH", body);
      const q = tab === "all" ? "" : `?status=${tab}`;
      const res = await apiGet<{ leads: WhatsAppLead[] }>(`/api/admin/leads${q}`);
      setLeads(res.leads);
      setNotes(Object.fromEntries(res.leads.map((l) => [l.id, l.note ?? ""])));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setLoading(true);
    try {
      await apiSend(`/api/admin/leads/${id}`, "DELETE");
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
      setLoading(false);
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
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada lead. Lead masuk otomatis saat pengunjung mengisi form
          WhatsApp di situs publik.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {lead.visitor_name || "Tanpa nama"}
                    <span className="ml-2 font-mono text-sm text-muted">
                      {lead.visitor_phone}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {fmt(lead.created_at)}
                    {lead.page_path ? ` · ${lead.page_path}` : ""}
                    {lead.article_slug ? ` · artikel: ${lead.article_slug}` : ""}
                    {lead.status ? ` · ${lead.status}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                    lead.status === "new"
                      ? "border-accent text-accent"
                      : lead.status === "contacted"
                        ? "border-line text-muted"
                        : "border-line text-good"
                  }`}
                >
                  {lead.status}
                </span>
              </div>

              {lead.visitor_message ? (
                <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
                  {lead.visitor_message}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <a
                  href={waChatLink(
                    lead.visitor_phone,
                    `Halo ${lead.visitor_name || ""}, terima kasih sudah menghubungi lewat WhatsApp.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-[#25D366] px-3 py-1.5 font-semibold text-white hover:brightness-95"
                >
                  Balas via WhatsApp
                </a>

                <select
                  value={lead.status}
                  disabled={busyId === lead.id}
                  onChange={(e) =>
                    patch(lead.id, { status: e.target.value as LeadStatus }, true)
                  }
                  className="rounded-md border border-line bg-surface px-2 py-1.5 outline-none focus:border-accent disabled:opacity-60"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={busyId === lead.id}
                  onClick={() => remove(lead.id)}
                  className="rounded-md border border-line px-3 py-1.5 hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  value={notes[lead.id] ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [lead.id]: e.target.value }))
                  }
                  placeholder="Catatan internal…"
                  className="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 outline-none focus:border-accent"
                />
                <button
                  type="button"
                  disabled={busyId === lead.id}
                  onClick={() =>
                    patch(lead.id, { note: notes[lead.id] ?? "" }, true)
                  }
                  className="rounded-md border border-line px-3 py-1.5 hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Simpan catatan
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
