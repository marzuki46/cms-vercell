/** Normalise a WhatsApp number into international digits (e.g. 6281234567890). */
export function normalizeWaNumber(raw: string): string {
  let digits = (raw ?? "")
    .replace(/[\s().\-]/g, "")
    .replace(/^\+/, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  // Indonesian local numbers: 0812… → 62812…
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits;
}

/** A wa.me deep link with an optional prefilled message. */
export function waLink(number: string, text?: string): string {
  const digits = normalizeWaNumber(number);
  const base = digits ? `https://wa.me/${digits}` : "";
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** True when a usable WhatsApp number is configured. */
export function hasWhatsAppNumber(number: string | null | undefined): boolean {
  return Boolean(number && normalizeWaNumber(number).length >= 8);
}
