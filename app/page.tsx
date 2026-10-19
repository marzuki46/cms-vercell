import Link from "next/link";
import ArticleCard from "@/components/article-card";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { env } from "@/lib/env";
import {
  getPublishedArticles,
  getPublishedCount,
  getContactSettings,
  getSiteSettings,
} from "@/lib/content";

export const revalidate = 300;

export default async function Home() {
  const [site, total, articles, contact] = await Promise.all([
    getSiteSettings(),
    getPublishedCount(),
    getPublishedArticles(6),
    getContactSettings(),
  ]);

  const siteUrl = env.siteUrl || "http://localhost:3000";

  return (
    <div className="flex flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${siteUrl}#website`,
              url: siteUrl,
              name: site.site_name,
              description: `Pusat artikel terpercaya dan panduan mendalam seputar industri dan tren terbaru dari ${site.site_name}.`,
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/blog?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              "@id": `${siteUrl}#organization`,
              name: site.site_name,
              url: siteUrl,
            },
          ],
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#e4e7ec] bg-gradient-to-b from-[#f8fafc] via-[#ffffff] to-[#ffffff] py-20 sm:py-28">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2271b1]/20 bg-[#2271b1]/5 px-3 py-1 text-xs font-semibold text-[#2271b1] mb-6">
            <span>🚀</span>
            <span>Portal Pengetahuan & Wawasan Resmi</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-[#1d2327] sm:text-6xl leading-[1.12]">
            Informasi Terpercaya & Panduan Mendalam untuk Pertumbuhan Anda.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#50575e]">
            Selamat datang di <strong>{site.site_name}</strong>. Kami menyajikan ulasan berbasis data, panduan terverifikasi, dan analisis strategis untuk membantu Anda mengambil keputusan terbaik.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/blog"
              className="rounded-lg bg-[#2271b1] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#135e96] transition"
            >
              Jelajahi Semua Artikel
            </Link>
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={contact.whatsapp_message}
              label="Konsultasi Cepat via WhatsApp"
            />
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-[#e4e7ec] pt-8 sm:grid-cols-4">
            <div>
              <p className="text-3xl font-extrabold text-[#1d2327]">{total}+</p>
              <p className="text-xs font-medium text-[#646970] mt-1">Artikel Terbit</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1d2327]">100%</p>
              <p className="text-xs font-medium text-[#646970] mt-1">Riset Terverifikasi</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1d2327]">SEO</p>
              <p className="text-xs font-medium text-[#646970] mt-1">Terstruktur & Rapi</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#008a20]">Aktif</p>
              <p className="text-xs font-medium text-[#646970] mt-1">Dukungan Responsif</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Proposition */}
      <section className="border-b border-[#e4e7ec] bg-[#ffffff] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-[#1d2327] sm:text-3xl">
              Kenapa Membaca di {site.site_name}?
            </h2>
            <p className="mt-3 text-sm text-[#50575e]">
              Standar editorial ketat kami memastikan setiap konten memberikan wawasan aplikatif dan dapat dipertanggungjawabkan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-[#e4e7ec] p-6 bg-[#fbfbfd] hover:border-[#2271b1]/40 transition">
              <div className="w-10 h-10 rounded-lg bg-[#2271b1]/10 flex items-center justify-center text-xl mb-4 text-[#2271b1]">
                📚
              </div>
              <h3 className="text-lg font-bold text-[#1d2327] mb-2">Long-Form Komprehensif</h3>
              <p className="text-sm text-[#50575e] leading-relaxed">
                Artikel disusun mendalam, membedah topik dari fondasi hingga langkah eksekusi konkret.
              </p>
            </div>

            <div className="rounded-xl border border-[#e4e7ec] p-6 bg-[#fbfbfd] hover:border-[#2271b1]/40 transition">
              <div className="w-10 h-10 rounded-lg bg-[#008a20]/10 flex items-center justify-center text-xl mb-4 text-[#008a20]">
                🎯
              </div>
              <h3 className="text-lg font-bold text-[#1d2327] mb-2">Solutif & Tepat Sasaran</h3>
              <p className="text-sm text-[#50575e] leading-relaxed">
                Setiap paragraf dirancang menjawab kendala spesifik yang dihadapi audiens dalam praktiknya.
              </p>
            </div>

            <div className="rounded-xl border border-[#e4e7ec] p-6 bg-[#fbfbfd] hover:border-[#2271b1]/40 transition">
              <div className="w-10 h-10 rounded-lg bg-[#6b8cff]/10 flex items-center justify-center text-xl mb-4 text-[#2271b1]">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-[#1d2327] mb-2">Pembaruan Berkelanjutan</h3>
              <p className="text-sm text-[#50575e] leading-relaxed">
                Data dan rujukan dievaluasi secara berkala agar materi tetap relevan dan akurat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Articles Grid */}
      <section className="py-16 sm:py-20 bg-[#f8fafc]">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#e4e7ec] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                Publikasi Pilihan
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-[#1d2327] mt-1 sm:text-3xl">
                Artikel Terbaru
              </h2>
            </div>
            <Link
              href="/blog"
              className="text-sm font-semibold text-[#2271b1] hover:underline"
            >
              Lihat Semua Koleksi →
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-12 text-center">
              <p className="text-base font-semibold text-[#1d2327]">
                Koleksi artikel sedang dalam persiapan.
              </p>
              <p className="mt-1 text-sm text-[#646970]">
                Silakan kembali beberapa saat lagi untuk membaca pembaruan wawasan terbaru kami.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Direct Contact Banner */}
      <section className="border-t border-[#e4e7ec] bg-white py-16">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="rounded-2xl bg-gradient-to-r from-[#1d2327] to-[#2c3338] p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="max-w-xl">
              <span className="text-xs font-bold tracking-widest uppercase text-[#72aee6]">
                Ada Pertanyaan atau Kolaborasi?
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold mt-2 leading-tight">
                Hubungi Tim {site.site_name} Sekarang
              </h3>
              <p className="mt-3 text-sm text-[#c3c4c7] leading-relaxed">
                Kami siap membantu mendiskusikan peluang kerja sama, pertanyaan seputar topik artikel, atau saran ide yang relevan bagi pembaca.
              </p>
            </div>
            <div className="shrink-0">
              <WhatsAppChatButton
                variant="inline"
                number={contact.whatsapp_number}
                message={contact.whatsapp_message}
                label="Mulai Percakapan WhatsApp"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
