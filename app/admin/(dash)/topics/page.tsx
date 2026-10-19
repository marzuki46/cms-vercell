import TopicsAdmin from "@/components/admin/topics-admin";

export const dynamic = "force-dynamic";

export default function AdminTopicsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold tracking-tight">Topik</h1>
      <TopicsAdmin />
    </div>
  );
}
