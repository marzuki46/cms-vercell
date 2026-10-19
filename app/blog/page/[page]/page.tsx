import { notFound } from "next/navigation";
import BlogIndex, { BLOG_PAGE_SIZE } from "@/components/blog-index";
import { getPublishedCount } from "@/lib/content";

export const revalidate = 300;

interface Props {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
  const total = await getPublishedCount();
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  return Array.from({ length: totalPages }, (_, i) => ({
    page: String(i + 1),
  }));
}

export async function generateMetadata({ params }: Props) {
  const { page } = await params;
  const n = Number(page);
  return {
    title: n > 1 ? `Blog — Halaman ${n}` : "Blog",
    alternates: {
      canonical: n > 1 ? `/blog/page/${n}` : "/blog",
    },
    robots: n > 1 ? { index: true, follow: true } : undefined,
  };
}

export default async function BlogPage({ params }: Props) {
  const { page: raw } = await params;
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1) notFound();

  const total = await getPublishedCount();
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  if (page > totalPages) notFound();

  return <BlogIndex page={page} />;
}
