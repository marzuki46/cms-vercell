import SettingsForm from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold tracking-tight">Pengaturan</h1>
      <SettingsForm />
    </div>
  );
}
