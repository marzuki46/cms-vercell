import LeadsAdmin from "@/components/admin/leads-admin";

export const dynamic = "force-dynamic";

export default function AdminLeadsPage() {
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold tracking-tight">
        Lead WhatsApp
      </h1>
      <p className="mb-6 text-sm text-muted">
        Pengunjung yang meninggalkan nomor lewat tombol WhatsApp di situs
        publik. Nomor di sini dinormalisasi ke format internasional.
      </p>
      <LeadsAdmin />
    </div>
  );
}
