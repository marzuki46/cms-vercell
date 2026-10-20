import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { env } from "@/lib/env";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  getPublishedArticles,
  getPublishedCount,
  getContactSettings,
  getSiteSettings,
} from "@/lib/content";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const [site, total, articles, contact] = await Promise.all([
    getSiteSettings(),
    getPublishedCount(locale),
    getPublishedArticles(6, 0, locale),
    getContactSettings(),
  ]);

  const base = env.siteUrl || "http://localhost:3000";
  const template = site.theme_template || "modern";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}#website`,
        url: base,
        name: site.site_name,
        inLanguage: locale === "en" ? "en" : "id-ID",
        potentialAction: {
          "@type": "SearchAction",
          target: `${base}/${locale}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${base}/${locale}#webpage`,
        url: `${base}/${locale}`,
        name: site.site_name,
        isPartOf: { "@id": `${base}#website` },
        inLanguage: locale === "en" ? "en" : "id-ID",
        about: { "@id": `${base}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${base}#organization`,
        name: site.site_name,
        url: base,
        logo: { "@type": "ImageObject", url: `${base}/api/og` },
      },
    ],
  };

  return (
    <div className={`flex flex-col ${template === "editorial" ? "font-serif" : ""}`}>
      <JsonLd data={jsonLd} />

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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2271b1]/20 bg-[#2271b1]/5 px-3 py-1 text-xs font-semibold text-[#2271b1]">
            <span aria-hidden="true">🚀</span>
            <span>{copy(locale).badge}</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#1d2327] sm:text-6xl">
            {copy(locale).heroTitle(site.site_name)}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#50575e]">
            {copy(locale).heroSubtitle(site.site_name)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/${locale}/blog`}
              className="rounded-lg bg-[#2271b1] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#135e96]"
            >
              {copy(locale).exploreBtn}
            </Link>
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={contact.whatsapp_message}
              label={copy(locale).chatBtn}
            />
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-[#e4e7ec] pt-8 sm:grid-cols-4">
            {copy(locale).metrics(total).map((m) => (
              <div key={m.label}>
                <p className="text-3xl font-extrabold text-[#1d2327]">{m.value}</p>
                <p className="mt-1 text-xs font-medium text-[#646970]">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value proposition */}
      <section className="border-b border-[#e4e7ec] bg-[#ffffff] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1d2327] sm:text-3xl">
              {copy(locale).whyTitle(site.site_name)}
            </h2>
            <p className="mt-3 text-sm text-[#50575e]">
              {copy(locale).whySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {copy(locale).pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-[#e4e7ec] bg-[#fbfbfd] p-6 transition hover:border-[#2271b1]/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#2271b1]/10 text-xl text-[#2271b1]">
                  {p.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#1d2327]">{p.title}</h3>
                <p className="text-sm leading-relaxed text-[#50575e]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest articles */}
      <section className="bg-[#f8fafc] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#e4e7ec] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2271b1]">
                {copy(locale).featuredBadge}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1d2327] sm:text-3xl">
                {copy(locale).latestTitle}
              </h2>
            </div>
            <Link
              href={`/${locale}/blog`}
              className="text-sm font-semibold text-[#2271b1] hover:underline"
            >
              {copy(locale).viewAllLink}
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-12 text-center">
              <p className="text-base font-semibold text-[#1d2327]">
                {copy(locale).noArticles}
              </p>
              <p className="mt-1 text-sm text-[#646970]">{copy(locale).noArticlesSub}</p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a.slug} article={a} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#e4e7ec] bg-white py-16">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="flex flex-col items-center justify-between gap-8 rounded-2xl bg-gradient-to-r from-[#1d2327] to-[#2c3338] p-8 text-white shadow-sm md:flex-row sm:p-12">
            <div className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#72aee6]">
                {copy(locale).ctaBadge}
              </span>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                {copy(locale).ctaTitle(site.site_name)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#c3c4c7]">
                {copy(locale).ctaSubtitle}
              </p>
            </div>
            <div className="shrink-0">
              <WhatsAppChatButton
                variant="inline"
                number={contact.whatsapp_number}
                message={contact.whatsapp_message}
                label={copy(locale).chatBtn}
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function copy(locale: Locale) {
  const en = locale === "en";
  return {
    badge: en ? "Official Publication Portal" : "Portal Pengetahuan & Wawasan Resmi",
    heroTitle: (name: string) =>
      en
        ? `Insights & Comprehensive Guides by ${name}.`
        : `Informasi Terpercaya & Panduan Mendalam dari ${name}.`,
    heroSubtitle: (name: string) =>
      en
        ? `Welcome to ${name}. We deliver data-driven articles, verified recommendations and strategic analysis to help you make better decisions.`
        : `Selamat datang di ${name}. Kami menyajikan ulasan berbasis data, panduan terverifikasi, dan analisis strategis untuk membantu Anda mengambil keputusan terbaik.`,
    exploreBtn: en ? "Explore All Articles" : "Jelajahi Semua Artikel",
    chatBtn: en ? "Chat via WhatsApp" : "Konsultasi Cepat via WhatsApp",
    metrics: (total: number) =>
      en
        ? [
            { value: `${total}+`, label: "Published Posts" },
            { value: "100%", label: "Verified Research" },
            { value: "SEO", label: "Optimized Structure" },
            { value: "24/7", label: "Responsive Support" },
          ]
        : [
            { value: `${total}+`, label: "Artikel Terbit" },
            { value: "100%", label: "Riset Terverifikasi" },
            { value: "SEO", label: "Terstruktur & Rapi" },
            { value: "24/7", label: "Dukungan Responsif" },
          ],
    whyTitle: (name: string) =>
      en ? `Why Read on ${name}?` : `Kenapa Membaca di ${name}?`,
    whySubtitle: en
      ? "Our strict editorial guidelines guarantee every story delivers actionable and factual value."
      : "Standar editorial ketat kami memastikan setiap konten memberikan wawasan aplikatif dan dapat dipertanggungjawabkan.",
    pillars: en
      ? [
          {
            icon: "📚",
            title: "Comprehensive Long-Form",
            desc: "Deep-dive articles breaking down core foundations and concrete step-by-step guides.",
          },
          {
            icon: "🎯",
            title: "Actionable & Targeted",
            desc: "Directly crafted to answer specific challenges and real search queries.",
          },
          {
            icon: "⚡",
            title: "Continuous Updates",
            desc: "Data and references are routinely evaluated to keep every topic fresh and accurate.",
          },
        ]
      : [
          {
            icon: "📚",
            title: "Long-Form Komprehensif",
            desc: "Artikel disusun mendalam, membedah topik dari fondasi hingga langkah eksekusi konkret.",
          },
          {
            icon: "🎯",
            title: "Solutif & Tepat Sasaran",
            desc: "Setiap paragraf dirancang menjawab kendala spesifik yang dihadapi audiens dalam praktiknya.",
          },
          {
            icon: "⚡",
            title: "Pembaruan Berkelanjutan",
            desc: "Data dan rujukan dievaluasi secara berkala agar materi tetap relevan dan akurat.",
          },
        ],
    featuredBadge: en ? "Featured Content" : "Publikasi Pilihan",
    latestTitle: en ? "Latest Articles" : "Artikel Terbaru",
    viewAllLink: en ? "View Entire Library →" : "Lihat Semua Koleksi →",
    noArticles: en ? "Articles are currently being prepared." : "Koleksi artikel sedang dalam persiapan.",
    noArticlesSub: en
      ? "Please check back soon for fresh insights."
      : "Silakan kembali beberapa saat lagi untuk membaca pembaruan wawasan terbaru kami.",
    ctaBadge: en ? "Questions or collaboration?" : "Ada Pertanyaan atau Kolaborasi?",
    ctaTitle: (name: string) =>
      en ? `Contact the ${name} Team Today` : `Hubungi Tim ${name} Sekarang`,
    ctaSubtitle: en
      ? "We are ready to discuss partnerships, answer questions, or discuss content suggestions."
      : "Kami siap membantu mendiskusikan peluang kerja sama, pertanyaan seputar topik artikel, atau saran ide yang relevan bagi pembaca.",
  };
}
