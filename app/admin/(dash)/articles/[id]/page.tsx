import ArticleEditor from "@/components/admin/article-editor";

export const dynamic = "force-dynamic";

export default async function AdminArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArticleEditor id={id} />;
}
