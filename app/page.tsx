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
  const isEn = site.language === "en";
  const template = site.theme_template || "modern";

  const t = {
    badge: isEn ? "Official Publication Portal" : "Portal Pengetahuan & Wawasan Resmi",
    heroTitle: isEn
      ? `Insights & Comprehensive Guides by ${site.site_name}.`
      : `Informasi Terpercaya & Panduan Mendalam dari ${site.site_name}.`,
    heroSubtitle: isEn
      ? `Discover data-driven articles, industry analyses, and verified recommendations to make better strategic decisions.`
      : `Selamat datang di ${site.site_name}. Kami menyajikan ulasan berbasis data, panduan terverifikasi, dan analisis strategis untuk membantu Anda mengambil keputusan terbaik.`,
    exploreBtn: isEn ? "Explore All Articles" : "Jelajahi Semua Artikel",
    chatBtn: isEn ? "Chat via WhatsApp" : "Konsultasi Cepat via WhatsApp",
    articlesMetric: isEn ? "Published Posts" : "Artikel Terbit",
    verifiedMetric: isEn ? "Verified Research" : "Riset Terverifikasi",
    seoMetric: isEn ? "Optimized SEO" : "Terstruktur & Rapi",
    activeMetric: isEn ? "Active Support" : "Dukungan Responsif",
    whyTitle: isEn ? `Why Read on ${site.site_name}?` : `Kenapa Membaca di ${site.site_name}?`,
    whySubtitle: isEn
      ? "Our strict editorial guidelines guarantee every story delivers actionable and factual value."
      : "Standar editorial ketat kami memastikan setiap konten memberikan wawasan aplikatif dan dapat dipertanggungjawabkan.",
    pillar1Title: isEn ? "Comprehensive Long-Form" : "Long-Form Komprehensif",
    pillar1Desc: isEn
      ? "Deep-dive articles breaking down core foundations and concrete step-by-step guides."
      : "Artikel disusun mendalam, membedah topik dari fondasi hingga langkah eksekusi konkret.",
    pillar2Title: isEn ? "Actionable & Targeted" : "Solutif & Tepat Sasaran",
    pillar2Desc: isEn
      ? "Directly crafted to address specific challenges and answer real search queries."
      : "Setiap paragraf dirancang menjawab kendala spesifik yang dihadapi audiens dalam praktiknya.",
    pillar3Title: isEn ? "Continuous Updates" : "Pembaruan Berkelanjutan",
    pillar3Desc: isEn
      ? "Data and references are routinely evaluated to keep topics fresh and accurate."
      : "Data dan rujukan dievaluasi secara berkala agar materi tetap relevan dan akurat.",
    featuredBadge: isEn ? "Featured Content" : "Publikasi Pilihan",
    latestTitle: isEn ? "Latest Articles" : "Artikel Terbaru",
    viewAllLink: isEn ? "View Entire Library →" : "Lihat Semua Koleksi →",
    noArticles: isEn ? "Articles are currently being prepared." : "Koleksi artikel sedang dalam persiapan.",
    noArticlesSub: isEn ? "Check back soon for fresh insights." : "Silakan kembali beberapa saat lagi untuk membaca pembaruan wawasan terbaru kami.",
    ctaBadge: isEn ? "Have Questions or Collaboration?" : "Ada Pertanyaan atau Kolaborasi?",
    ctaTitle: isEn ? `Contact ${site.site_name} Team Today` : `Hubungi Tim ${site.site_name} Sekarang`,
    ctaSubtitle: isEn
      ? "We are ready to discuss partnership opportunities, inquiries, or suggestions."
      : "Kami siap membantu mendiskusikan peluang kerja sama, pertanyaan seputar topik artikel, atau saran ide yang relevan bagi pembaca.",
  };

  return (
    <div className={`flex flex-col ${template === "editorial" ? "font-serif" : ""}`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${siteUrl}#website`,
              url: siteUrl,
              name: site.site_name,
              description: t.heroSubtitle,
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
      <section
        className={`relative overflow-hidden border-b border-[#e4e7ec] py-20 sm:py-28 ${
          template === "editorial"
            ? "bg-[#faf8f5]"
            : template === "minimal"
            ? "bg-white"
            : "bg-gradient-to-b from-[#f8fafc] via-[#ffffff] to-[#ffffff]"
        }`}
      >
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2271b1]/20 bg-[#2271b1]/5 px-3 py-1 text-xs font-semibold text-[#2271b1] mb-6">
            <span>🚀</span>
            <span>{t.badge}</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-[#1d2327] sm:text-6xl leading-[1.12]">
            {t.heroTitle}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#50575e]">
            {t.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/blog"
              className="rounded-lg bg-[#2271b1] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#135e96] transition"
            >
              {t.exploreBtn}
            </Link>
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={contact.whatsapp_message}
              label={t.chatBtn}
            />
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-[#e4e7ec] pt-8 sm:grid-cols-4">
            <div>
              <p className="text-3xl font-extrabold text-[#1d2327]">{total}+</p>
              <p className="text-xs font-medium text-[#646970] mt-1">{t.articlesMetric}</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1d2327]">100%</p>
              <p className="text-xs font-medium text-[#646970] mt-1">{t.verifiedMetric}</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1d2327]">SEO</p>
              <p className="text-xs font-medium text-[#646970] mt-1">{t.seoMetric}</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#008a20]">24/7</p>
              <p className="text-xs font-medium text-[#646970] mt-1">{t.activeMetric}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Proposition */}
      <section className="border-b border-[#e4e7ec] bg-[#ffffff] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-[#1d2327] sm:text-3xl">
              {t.whyTitle}
            </h2>
            <p className="mt-3 text-sm text-[#50575e]">
              {t.whySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-[#e4e7ec] p-6 bg-[#fbfbfd] hover:border-[#2271b1]/40 transition">
              <div className="w-10 h-10 rounded-lg bg-[#2271b1]/10 flex items-center justify-center text-xl mb-4 text-[#2271b1]">
                📚
              </div>
              <h3 className="text-lg font-bold text-[#1d2327] mb-2">{t.pillar1Title}</h3>
              <p className="text-sm text-[#50575e] leading-relaxed">
                {t.pillar1Desc}
              </p>
            </div>

            <div className="rounded-xl border border-[#e4e7ec] p-6 bg-[#fbfbfd] hover:border-[#2271b1]/40 transition">
              <div className="w-10 h-10 rounded-lg bg-[#008a20]/10 flex items-center justify-center text-xl mb-4 text-[#008a20]">
                🎯
              </div>
              <h3 className="text-lg font-bold text-[#1d2327] mb-2">{t.pillar2Title}</h3>
              <p className="text-sm text-[#50575e] leading-relaxed">
                {t.pillar2Desc}
              </p>
            </div>

            <div className="rounded-xl border border-[#e4e7ec] p-6 bg-[#fbfbfd] hover:border-[#2271b1]/40 transition">
              <div className="w-10 h-10 rounded-lg bg-[#6b8cff]/10 flex items-center justify-center text-xl mb-4 text-[#2271b1]">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-[#1d2327] mb-2">{t.pillar3Title}</h3>
              <p className="text-sm text-[#50575e] leading-relaxed">
                {t.pillar3Desc}
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
                {t.featuredBadge}
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-[#1d2327] mt-1 sm:text-3xl">
                {t.latestTitle}
              </h2>
            </div>
            <Link
              href="/blog"
              className="text-sm font-semibold text-[#2271b1] hover:underline"
            >
              {t.viewAllLink}
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-12 text-center">
              <p className="text-base font-semibold text-[#1d2327]">
                {t.noArticles}
              </p>
              <p className="mt-1 text-sm text-[#646970]">
                {t.noArticlesSub}
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
                {t.ctaBadge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold mt-2 leading-tight">
                {t.ctaTitle}
              </h3>
              <p className="mt-3 text-sm text-[#c3c4c7] leading-relaxed">
                {t.ctaSubtitle}
              </p>
            </div>
            <div className="shrink-0">
              <WhatsAppChatButton
                variant="inline"
                number={contact.whatsapp_number}
                message={contact.whatsapp_message}
                label={t.chatBtn}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
