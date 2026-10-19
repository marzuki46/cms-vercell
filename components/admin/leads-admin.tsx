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
        <p className="text-sm text-[#646970]">Memuat lead…</p>
      ) : leads.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#646970] bg-white border border-[#c3c4c7] rounded shadow-sm">
          Belum ada lead. Lead masuk otomatis saat pengunjung mengisi form
          WhatsApp di situs publik.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-[#dcdcde] rounded-lg border border-[#c3c4c7] bg-white shadow-sm">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-3 px-4 py-4 hover:bg-[#fbfbfb]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#1d2327]">
                    {lead.visitor_name || "Tanpa nama"}
                    <span className="ml-2 font-mono text-sm text-[#2271b1]">
                      {lead.visitor_phone}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-[#646970]">
                    {fmt(lead.created_at)}
                    {lead.page_path ? ` · ${lead.page_path}` : ""}
                    {lead.article_slug ? ` · artikel: ${lead.article_slug}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                    lead.status === "new"
                      ? "bg-[#e5f5fa] text-[#0073aa]"
                      : lead.status === "contacted"
                        ? "bg-[#fcf9e8] text-[#996800]"
                        : "bg-[#edfaef] text-[#008a20]"
                  }`}
                >
                  {lead.status}
                </span>
              </div>

              {lead.visitor_message ? (
                <p className="rounded border border-[#dcdcde] bg-[#f6f7f7] text-[#1d2327] px-3 py-2 text-sm">
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
                  className="rounded bg-[#25D366] px-3 py-1.5 font-bold text-white hover:brightness-95 shadow-xs"
                >
                  Balas via WhatsApp
                </a>

                <select
                  value={lead.status}
                  disabled={busyId === lead.id}
                  onChange={(e) =>
                    patch(lead.id, { status: e.target.value as LeadStatus }, true)
                  }
                  className="rounded border border-[#8c8f94] bg-white text-[#1d2327] px-2.5 py-1.5 outline-none focus:border-[#2271b1] disabled:opacity-60"
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
                  className="rounded border border-[#d63638] text-[#d63638] px-3 py-1.5 hover:bg-[#d63638] hover:text-white transition disabled:opacity-50"
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
                  placeholder="Tambah catatan internal admin…"
                  className="flex-1 rounded border border-[#8c8f94] bg-white text-[#1d2327] px-3 py-1.5 outline-none focus:border-[#2271b1]"
                />
                <button
                  type="button"
                  disabled={busyId === lead.id}
                  onClick={() =>
                    patch(lead.id, { note: notes[lead.id] ?? "" }, true)
                  }
                  className="rounded border border-[#2271b1] text-[#2271b1] px-3 py-1.5 hover:bg-[#2271b1] hover:text-white transition disabled:opacity-50"
                >
                  Simpan Catatan
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
