import ArticlesAdmin from "@/components/admin/articles-admin";

export const dynamic = "force-dynamic";

export default function AdminArticlesPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold tracking-tight">Artikel</h1>
      <ArticlesAdmin />
    </div>
  );
}
