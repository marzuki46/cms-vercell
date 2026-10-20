"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard runtime error:", error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-red-600">
        <span className="text-2xl">⚠️</span>
        <h2 className="text-lg font-bold">Terjadi Kesalahan di Dashboard</h2>
      </div>

      <p className="mt-3 text-sm text-[#50575e]">
        Sistem mendeteksi kendala saat memuat data:
      </p>

      <div className="mt-3 rounded border border-gray-200 bg-[#f6f7f7] p-3 font-mono text-xs text-[#1d2327]">
        {error.message || "Unknown error occurred"}
        {error.digest ? ` (Digest: ${error.digest})` : ""}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#135e96]"
        >
          Muat Ulang (Retry)
        </button>
        <Link
          href="/admin/settings"
          className="rounded border border-[#c3c4c7] bg-white px-4 py-2 text-sm font-semibold text-[#1d2327] hover:bg-[#f6f7f7]"
        >
          Buka Pengaturan
        </Link>
        <Link
          href="/id"
          className="text-sm font-medium text-[#2271b1] hover:underline"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
