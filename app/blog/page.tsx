import BlogIndex from "@/components/blog-index";

export const revalidate = 300;

export default function BlogPageOne() {
  return <BlogIndex page={1} />;
}
