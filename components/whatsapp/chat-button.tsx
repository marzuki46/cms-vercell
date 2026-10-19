"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
  number: string | null;
  message: string | null;
  slug?: string;
  label?: string;
  variant?: "floating" | "inline";
}

function normalizeWaNumber(raw: string): string {
  let digits = raw.replace(/[\s().\-]/g, "").replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits;
}

function waLink(number: string, text: string): string {
  const digits = normalizeWaNumber(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function WaIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsAppChatButton({
  number,
  message,
  slug,
  label = "Chat WhatsApp",
  variant = "floating",
}: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  function openForm() {
    setOpen(true);
    setDone(false);
    setRecorded(false);
    setError(null);
    setBusy(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => firstInput.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Masukkan nomor WhatsApp yang valid.");
      setBusy(false);
      return;
    }

    const path = window.location.pathname;
    const referrer = document.referrer || "";
    const configured = Boolean(number && normalizeWaNumber(number).length >= 8);

    try {
      const res = await fetch("/api/leads/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: digits,
          name,
          message: text,
          path,
          slug: slug ?? "",
          referrer,
        }),
      });
      const data: { ok?: boolean; recorded?: boolean; error?: string } =
        await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Gagal menyimpan data.");
      }
      setRecorded(Boolean(data.recorded));
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      return;
    }

    if (configured) {
      const lines = [
        message?.trim() || "Halo, saya tertarik dan ingin ngobrol.",
        name ? `Nama: ${name}` : "",
        `Nomor WhatsApp saya: ${phone}`,
        text ? `Pesan: ${text}` : "",
        `Halaman: ${path}`,
      ].filter(Boolean);
      window.location.assign(waLink(number!, lines.join("\n")));
    }

    setBusy(false);
  }

  const trigger =
    variant === "floating" ? (
      <button
        type="button"
        onClick={openForm}
        aria-haspopup="dialog"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <WaIcon className="h-5 w-5" />
        {label}
      </button>
    ) : (
      <button
        type="button"
        onClick={openForm}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-md bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 focus:outline-none focus-visible:ring-2"
      >
        <WaIcon className="h-4 w-4" />
        {label}
      </button>
    );

  if (!open) return trigger;

  return (
    <>
      {trigger}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hubungi via WhatsApp"
          className="w-full max-w-md rounded-xl border border-line bg-background p-5 shadow-2xl"
        >
          {done ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                {recorded ? "Data Anda tersimpan" : "WhatsApp siap dibuka"}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {recorded
                  ? number
                    ? "Terima kasih. Jendela WhatsApp akan terbuka — kirim pesannya, tim kami segera membalas."
                    : "Terima kasih. Data kontak Anda sudah tercatat di sistem kami."
                  : "WhatsApp siap dibuka, tetapi pencatatan lead belum aktif. Silakan hubungi admin untuk mengaktifkan Supabase."}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="self-start rounded-md border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent"
              >
                Tutup
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">Chat via WhatsApp</h2>
                <p className="mt-1 text-sm text-muted">
                  Tinggalkan nomor Anda — pesan akan langsung diarahkan ke
                  WhatsApp, dan kontak Anda tercatat di sistem kami.
                </p>
              </div>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted">
                  Nomor WhatsApp <span className="text-warn">*</span>
                </span>
                <input
                  ref={firstInput}
                  id="whatsapp-phone"
                  aria-describedby={error ? "whatsapp-error" : undefined}
                  type="tel"
                  required
                  inputMode="tel"
                  placeholder="0812 3456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted">Nama (opsional)</span>
                <input
                  type="text"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted">Pesan (opsional)</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Saya ingin tahu lebih lanjut tentang…"
                  className="resize-y rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
                />
              </label>

              {error ? (
                <p
                  id="whatsapp-error"
                  role="alert"
                  className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-warn"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
                >
                  <WaIcon className="h-4 w-4" />
                  {busy ? "Mengirim…" : "Kirim & buka WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-accent hover:text-accent"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
