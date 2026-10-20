"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f0f1] p-5 font-sans">
      <div className="w-full max-w-lg rounded-xl border border-[#c3c4c7] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-red-600">
          <span className="text-3xl">⚠️</span>
          <h1 className="text-xl font-bold text-[#1d2327]">Terjadi Kendala Memuat Halaman</h1>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#50575e]">
          Server mendeteksi kendala pada data atau koneksi layanan:
        </p>

        <div className="mt-3 rounded border border-gray-200 bg-[#f6f7f7] p-3 font-mono text-xs text-[#1d2327] break-all">
          {error.message || "Unknown error"}
          {error.digest ? ` (Kode: ${error.digest})` : ""}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded bg-[#2271b1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#135e96]"
          >
            Coba Lagi
          </button>
          <Link
            href="/id"
            className="rounded border border-[#c3c4c7] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d2327] hover:bg-[#f6f7f7]"
          >
            Ke Beranda
          </Link>
          <Link
            href="/admin/login"
            className="text-sm font-medium text-[#2271b1] hover:underline"
          >
            Login Ulang
          </Link>
        </div>
      </div>
    </div>
  );
}
