import Link from "next/link";
import GeneratePanel from "@/components/admin/generate-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { formatDate } from "@/components/article-card";
import type { ArticleStatus, TopicStatus } from "@/types/db";

export const dynamic = "force-dynamic";

const ARTICLE_STATUSES: ArticleStatus[] = [
  "published",
  "draft",
  "scheduled",
  "archived",
];
const TOPIC_STATUSES: TopicStatus[] = ["idea", "approved", "used", "rejected"];

async function loadData() {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();

  const articleCounts = await Promise.all(
    ARTICLE_STATUSES.map(async (status) => {
      const { count } = await sb
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      return [status, count ?? 0] as const;
    }),
  );

  const topicCounts = await Promise.all(
    TOPIC_STATUSES.map(async (status) => {
      const { count } = await sb
        .from("topics")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      return [status, count ?? 0] as const;
    }),
  );

  const [{ data: jobs }, { data: articles }] = await Promise.all([
    sb
      .from("generation_jobs")
      .select("id,type,status,model,error,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(8),
    sb
      .from("articles")
      .select("id,title,slug,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    articleCounts: Object.fromEntries(articleCounts) as Record<string, number>,
    topicCounts: Object.fromEntries(topicCounts) as Record<string, number>,
    jobs: jobs ?? [],
    articles: articles ?? [],
  };
}

export default async function AdminDashboard() {
  const data = await loadData();

  if (!data) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold">Supabase belum dikonfigurasi</h1>
        <p className="mt-2 text-sm text-muted">
          Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> pada environment, lalu jalankan
          migrasi <code>supabase/migrations/0001_init.sql</code>.
        </p>
      </div>
    );
  }

  const { articleCounts, topicCounts, jobs, articles } = data;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ARTICLE_STATUSES.map((status) => (
          <div key={status} className="rounded-lg border border-line p-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              Artikel {status}
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {articleCounts[status] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {TOPIC_STATUSES.map((status) => (
          <div key={status} className="rounded-lg border border-line p-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              Topik {status}
            </p>
            <p className="mt-1 text-xl font-semibold">
              {topicCounts[status] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <GeneratePanel />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold tracking-tight">
            Job terakhir
          </h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">Belum ada job.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium">{j.type}</span>
                  <span
                    className={
                      j.status === "success"
                        ? "text-good"
                        : j.status === "error"
                          ? "text-warn"
                          : "text-muted"
                    }
                  >
                    {j.status}
                  </span>
                  <span className="text-xs text-muted" title={j.error ?? ""}>
                    {formatDate(j.started_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold tracking-tight">
            Artikel terbaru
          </h2>
          {articles.length === 0 ? (
            <p className="text-sm text-muted">Belum ada artikel.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {articles.map((a) => (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {a.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
