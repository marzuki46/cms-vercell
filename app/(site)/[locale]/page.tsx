import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/article-card";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, ogLocale, type Locale } from "@/lib/i18n";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const site = await getSiteSettings();
  const base = env.siteUrl || "http://localhost:3000";
  const custom = site.home_copy?.[locale];

  const title =
    custom?.meta_title ||
    (locale === "en"
      ? `Insights & Comprehensive Guides · ${site.site_name}`
      : `Informasi Terpercaya & Panduan Mendalam · ${site.site_name}`);

  const description =
    custom?.meta_description ||
    (locale === "en"
      ? `Welcome to ${site.site_name}. Explore data-driven articles, verified recommendations, and strategic analyses.`
      : `Selamat datang di ${site.site_name}. Temukan artikel terpercaya, panduan mendalam, dan informasi terbaru.`);

  const ogImage = `${base}/api/og?title=${encodeURIComponent(
    custom?.meta_title || site.site_name,
  )}&excerpt=${encodeURIComponent(description.slice(0, 150))}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${locale}`,
      languages: {
        id: `${base}/id`,
        en: `${base}/en`,
        "x-default": `${base}/${DEFAULT_LOCALE}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: site.site_name,
      title,
      description,
      url: `${base}/${locale}`,
      locale: ogLocale(locale),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
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
  const c = copy(locale, site.home_copy, site.site_name);

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
            <span>{c.badge}</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#1d2327] sm:text-6xl">
            {c.heroTitle}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#50575e]">
            {c.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/${locale}/blog`}
              className="rounded-lg bg-[#2271b1] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#135e96]"
            >
              {c.exploreBtn}
            </Link>
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={contact.whatsapp_message}
              label={c.chatBtn}
            />
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-[#e4e7ec] pt-8 sm:grid-cols-4">
            {c.metrics(total).map((m) => (
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
              {c.whyTitle}
            </h2>
            <p className="mt-3 text-sm text-[#50575e]">
              {c.whySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {c.pillars.map((p) => (
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
                {c.featuredBadge}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1d2327] sm:text-3xl">
                {c.latestTitle}
              </h2>
            </div>
            <Link
              href={`/${locale}/blog`}
              className="text-sm font-semibold text-[#2271b1] hover:underline"
            >
              {c.viewAllLink}
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-12 text-center">
              <p className="text-base font-semibold text-[#1d2327]">
                {c.noArticles}
              </p>
              <p className="mt-1 text-sm text-[#646970]">{c.noArticlesSub}</p>
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
                {c.ctaBadge}
              </span>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                {c.ctaTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#c3c4c7]">
                {c.ctaSubtitle}
              </p>
            </div>
            <div className="shrink-0">
              <WhatsAppChatButton
                variant="inline"
                number={contact.whatsapp_number}
                message={contact.whatsapp_message}
                label={c.chatBtn}
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function copy(locale: Locale, customCopy?: import("@/types/db").HomeCopy | null, siteName = "Situs Anda") {
  const en = locale === "en";
  const custom = customCopy?.[locale] || {};

  return {
    badge: custom.hero_badge || (en ? "Official Publication Portal" : "Portal Pengetahuan & Wawasan Resmi"),
    heroTitle: custom.hero_title || (en
      ? `Insights & Comprehensive Guides by ${siteName}.`
      : `Informasi Terpercaya & Panduan Mendalam dari ${siteName}.`),
    heroSubtitle: custom.hero_subtitle || (en
      ? `Welcome to ${siteName}. We deliver data-driven articles, verified recommendations and strategic analysis to help you make better decisions.`
      : `Selamat datang di ${siteName}. Kami menyajikan ulasan berbasis data, panduan terverifikasi, dan analisis strategis untuk membantu Anda mengambil keputusan terbaik.`),
    exploreBtn: custom.explore_button || (en ? "Explore All Articles" : "Jelajahi Semua Artikel"),
    chatBtn: custom.chat_button || (en ? "Chat via WhatsApp" : "Konsultasi Cepat via WhatsApp"),
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
    whyTitle: custom.why_title || (en ? `Why Read on ${siteName}?` : `Kenapa Membaca di ${siteName}?`),
    whySubtitle: custom.why_subtitle || (en
      ? "Our strict editorial guidelines guarantee every story delivers actionable and factual value."
      : "Standar editorial ketat kami memastikan setiap konten memberikan wawasan aplikatif dan dapat dipertanggungjawabkan."),
    pillars: [
      {
        icon: "📚",
        title: custom.pillar1_title || (en ? "Comprehensive Long-Form" : "Long-Form Komprehensif"),
        desc: custom.pillar1_desc || (en
          ? "Deep-dive articles breaking down core foundations and concrete step-by-step guides."
          : "Artikel disusun mendalam, membedah topik dari fondasi hingga langkah eksekusi konkret."),
      },
      {
        icon: "🎯",
        title: custom.pillar2_title || (en ? "Actionable & Targeted" : "Solutif & Tepat Sasaran"),
        desc: custom.pillar2_desc || (en
          ? "Directly crafted to answer specific challenges and real search queries."
          : "Setiap paragraf dirancang menjawab kendala spesifik yang dihadapi audiens dalam praktiknya."),
      },
      {
        icon: "⚡",
        title: custom.pillar3_title || (en ? "Continuous Updates" : "Pembaruan Berkelanjutan"),
        desc: custom.pillar3_desc || (en
          ? "Data and references are routinely evaluated to keep every topic fresh and accurate."
          : "Data dan rujukan dievaluasi secara berkala agar materi tetap relevan dan akurat."),
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
    ctaTitle: custom.cta_title || (en ? `Contact the ${siteName} Team Today` : `Hubungi Tim ${siteName} Sekarang`),
    ctaSubtitle: custom.cta_subtitle || (en
      ? "We are ready to discuss partnerships, answer questions, or discuss content suggestions."
      : "Kami siap membantu mendiskusikan peluang kerja sama, pertanyaan seputar topik artikel, atau saran ide yang relevan bagi pembaca."),
  };
}
