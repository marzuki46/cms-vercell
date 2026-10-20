import Link from "next/link";
import { revalidatePath } from "next/cache";
import GeneratePanel from "@/components/admin/generate-panel";
import AutopilotPanel from "@/components/admin/autopilot-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/components/article-card";
import type { ArticleStatus, TopicStatus } from "@/types/db";

export const dynamic = "force-dynamic";

function refresh() {
  revalidatePath("/admin");
}

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

  try {
    const articleCounts = await Promise.all(
      ARTICLE_STATUSES.map(async (status) => {
        try {
          const { count } = await sb
            .from("articles")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          return [status, count ?? 0] as const;
        } catch {
          return [status, 0] as const;
        }
      }),
    );

    const topicCounts = await Promise.all(
      TOPIC_STATUSES.map(async (status) => {
        try {
          const { count } = await sb
            .from("topics")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          return [status, count ?? 0] as const;
        } catch {
          return [status, 0] as const;
        }
      }),
    );

    const [{ data: jobs }, { data: articles }, { count: totalLeads }, settings] =
      await Promise.all([
        sb
          .from("generation_jobs")
          .select("id,type,status,model,error,started_at,finished_at")
          .order("started_at", { ascending: false })
          .limit(6),
        sb
          .from("articles")
          .select("id,title,slug,status,created_at,author,word_count")
          .order("created_at", { ascending: false })
          .limit(6),
        sb.from("whatsapp_leads").select("id", { count: "exact", head: true }),
        getSettings(),
      ]);

    return {
      articleCounts: Object.fromEntries(articleCounts) as Record<string, number>,
      topicCounts: Object.fromEntries(topicCounts) as Record<string, number>,
      jobs: jobs ?? [],
      articles: articles ?? [],
      totalLeads: totalLeads ?? 0,
      siteName: settings?.site_name ?? "Situs Anda",
      postsPerRun: Math.min(Math.max(settings?.posts_per_run ?? 3, 1), 10),
      aiReady: Boolean(settings?.ninerouter_url),
    };
  } catch (err) {
    console.error("loadData error:", (err as Error).message);
    return null;
  }
}

export default async function AdminDashboard() {
  const data = await loadData();

  if (!data) {
    return (
      <div className="bg-white border border-[#c3c4c7] p-6 rounded-lg shadow-sm">
        <h1 className="text-lg font-bold text-[#1d2327]">Selamat Datang di CMS SEO WP-Lite</h1>
        <p className="mt-2 text-sm text-[#646970]">
          Database Supabase belum terhubung di environment lokal. Jalankan di Vercel atau masukkan <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>SUPABASE_SERVICE_ROLE_KEY</code> ke <code>.env.local</code>.
        </p>
      </div>
    );
  }

  const {
    articleCounts,
    topicCounts,
    jobs,
    articles,
    totalLeads,
    siteName,
    postsPerRun,
    aiReady,
  } = data;

  const draftCount = articleCounts.draft ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-[#c3c4c7] p-6 rounded-lg shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d2327]">
            Dashboard Konten &amp; SEO
          </h1>
          <p className="text-sm text-[#646970] mt-1">
            Kelola pos blog, generate artikel SEO otomatis dengan AI, dan pantau
            prospek WhatsApp untuk{" "}
            <strong className="text-[#1d2327]">{siteName}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/articles/new"
            className="px-4 py-2 bg-[#2271b1] text-white text-sm font-semibold rounded hover:bg-[#135e96] transition shadow-sm"
          >
            ✏️ Tulis Pos Baru
          </Link>
          <Link
            href="/admin/topics"
            className="px-4 py-2 bg-[#f6f7f7] text-[#2c3338] border border-[#dcdcde] text-sm font-semibold rounded hover:bg-[#ebebeb] transition"
          >
            💡 Ide Topik AI
          </Link>
        </div>
      </div>

      {/* Action queue: what to do next */}
      {draftCount > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-[#dba617] bg-[#fcf9e8] px-4 py-3">
          <p className="text-sm font-semibold text-[#7a5c00]">
            📋 {draftCount} artikel menunggu review. Publish agar langsung tampil di
            halaman depan.
          </p>
          <Link
            href="/admin/articles?status=draft"
            className="shrink-0 rounded bg-[#996800] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#7a5c00]"
          >
            Review &amp; Publish →
          </Link>
        </div>
      ) : null}

      {/* WP-Style Stats Grid ("At a Glance") */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#c3c4c7] p-3.5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-[#646970] uppercase">Terbit (Live)</span>
          <p className="text-2xl font-extrabold text-[#008a20] mt-1">{articleCounts.published ?? 0}</p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-[#646970] uppercase">Draft</span>
          <p className="text-2xl font-extrabold text-[#2271b1] mt-1">{articleCounts.draft ?? 0}</p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-[#646970] uppercase">Terjadwal</span>
          <p className="text-2xl font-extrabold text-[#996800] mt-1">{articleCounts.scheduled ?? 0}</p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-[#646970] uppercase">Ide Topik</span>
          <p className="text-2xl font-extrabold text-[#50575e] mt-1">{topicCounts.idea ?? 0}</p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-[#646970] uppercase">Topik Disetujui</span>
          <p className="text-2xl font-extrabold text-[#2271b1] mt-1">{topicCounts.approved ?? 0}</p>
        </div>
        <div className="bg-white border border-[#c3c4c7] p-3.5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-[#646970] uppercase">Lead WhatsApp</span>
          <p className="text-2xl font-extrabold text-[#00a32a] mt-1">{totalLeads}</p>
        </div>
      </div>

      {/* AI Content Engine Widget */}
      <div className="bg-white border border-[#c3c4c7] rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[#f6f7f7] px-4 py-3 border-b border-[#dcdcde] flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#1d2327] flex items-center gap-1.5">
            <span>⚡</span>
            <span>Mesin Konten AI (9Router)</span>
          </h2>
          <Link href="/admin/settings" className="text-xs text-[#2271b1] hover:underline">
            Ubah Model & Prompt →
          </Link>
        </div>
        <div className="p-4 flex flex-col gap-5">
          <AutopilotPanel
            count={postsPerRun}
            disabled={!aiReady}
            onDone={refresh}
          />
          <details className="border-t border-[#dcdcde] pt-4">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-[#50575e]">
              Mode manual (satu per satu)
            </summary>
            <div className="mt-3">
              <GeneratePanel />
            </div>
          </details>
        </div>
      </div>

      {/* Two Column Layout for Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
        <div className="bg-white border border-[#c3c4c7] rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="bg-[#f6f7f7] px-4 py-3 border-b border-[#dcdcde] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1d2327]">Pos Terbaru</h2>
            <Link href="/admin/articles" className="text-xs text-[#2271b1] hover:underline">
              Semua Pos →
            </Link>
          </div>
          <div className="p-0 flex-1">
            {articles.length === 0 ? (
              <p className="p-4 text-sm text-[#646970]">Belum ada pos yang dibuat.</p>
            ) : (
              <ul className="divide-y divide-[#dcdcde] text-sm">
                {articles.map((a) => (
                  <li key={a.id} className="p-3.5 hover:bg-[#f6f7f7] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/articles/${a.id}`}
                        className="font-semibold text-[#2271b1] hover:underline truncate block"
                      >
                        {a.title}
                      </Link>
                      <div className="text-xs text-[#646970] mt-0.5 flex gap-2">
                        <span>{formatDate(a.created_at)}</span>
                        <span>·</span>
                        <span>{a.word_count ?? 0} kata</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        a.status === "published"
                          ? "bg-[#edfaef] text-[#008a20]"
                          : a.status === "draft"
                          ? "bg-[#f0f0f1] text-[#50575e]"
                          : "bg-[#fcf9e8] text-[#996800]"
                      }`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Generation Logs */}
        <div className="bg-white border border-[#c3c4c7] rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="bg-[#f6f7f7] px-4 py-3 border-b border-[#dcdcde]">
            <h2 className="text-sm font-bold text-[#1d2327]">Aktivitas AI Terakhir</h2>
          </div>
          <div className="p-0 flex-1">
            {jobs.length === 0 ? (
              <p className="p-4 text-sm text-[#646970]">Belum ada log pekerjaan AI.</p>
            ) : (
              <ul className="divide-y divide-[#dcdcde] text-sm">
                {jobs.map((j) => (
                  <li key={j.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-[#1d2327] capitalize">{j.type}</span>
                      <p className="text-xs text-[#646970] mt-0.5">
                        {j.model || "default model"} · {formatDate(j.started_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        j.status === "success"
                          ? "bg-[#edfaef] text-[#008a20]"
                          : j.status === "error"
                          ? "bg-[#fcf0f1] text-[#d63638]"
                          : "bg-[#e5f5fa] text-[#0073aa]"
                      }`}
                    >
                      {j.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
