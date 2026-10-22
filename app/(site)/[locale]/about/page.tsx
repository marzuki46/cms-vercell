import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { getContactSettings, getSiteSettings, getAuthorBySlug } from "@/lib/content";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const isEn = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";

  const title = isEn
    ? "About Tri Marzuki — Fullstack Web & App Developer, AI Setup & SEO Specialist"
    : "Tentang Tri Marzuki — Developer Website, Aplikasi, Setup AI & Spesialis SEO";

  const description = isEn
    ? "Learn more about Tri Marzuki, fullstack software developer and SEO strategist specializing in School Websites, LMS, Company Profiles, Village Portals, Android Apps, Custom Systems, AI Integration, and Google Business Profile optimization."
    : "Kenali profil Tri Marzuki, software developer dan spesialis SEO yang berpengalaman melayani jasa pembuatan website sekolah, LMS, company profile, portal desa, aplikasi Android, custom sistem, setup AI, dan optimasi Google Maps / Google My Business.";

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${locale}/about`,
      languages: {
        id: `${base}/id/about`,
        en: `${base}/en/about`,
        "x-default": `${base}/${DEFAULT_LOCALE}/about`,
      },
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${base}/${locale}/about`,
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const isEn = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";

  const [site, contact, author] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
    getAuthorBySlug("admin", locale),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${base}/${locale}/about`,
        url: `${base}/${locale}/about`,
        name: isEn ? "About Tri Marzuki" : "Tentang Tri Marzuki",
        isPartOf: { "@id": `${base}#website` },
        inLanguage: isEn ? "en" : "id-ID",
        about: { "@id": `${base}/${locale}#person` },
      },
      {
        "@type": "Person",
        "@id": `${base}/${locale}#person`,
        name: "Tri Marzuki",
        jobTitle: isEn
          ? "Fullstack Software Developer & Local SEO Strategist"
          : "Software Developer & Praktisi SEO",
        url: `${base}/${locale}/about`,
        image: author?.avatar_url || `${base}/api/og`,
        description: isEn
          ? "Professional software engineer and digital marketing strategist specializing in modern web development, LMS, custom business systems, mobile apps, and search engine dominance."
          : "Praktisi software development dan digital marketing spesialis pembuatan website modern, LMS, aplikasi sistem, Android, dan optimasi SEO & Google Maps.",
        knowsAbout: [
          "Web Development",
          "Learning Management System (LMS)",
          "School & Village Websites",
          "Company Profile Websites",
          "Android Mobile Apps",
          "Custom System Development",
          "Artificial Intelligence Setup",
          "Technical SEO",
          "Google Business Profile / Google Maps SEO",
        ],
      },
    ],
  };

  const services = isEn
    ? [
        {
          title: "School Websites & Village Portals",
          desc: "Dedicated, official, and accessible web portals designed to serve students, teachers, parents, and village communities with complete security and mobile-first responsiveness.",
        },
        {
          title: "Learning Management System (LMS)",
          desc: "High-capacity digital learning hubs complete with structured video lessons, automated quizzes, progress monitoring, and automated certification issuance.",
        },
        {
          title: "Corporate & Company Profiles",
          desc: "Prestigious corporate web assets engineered to build immediate market credibility, generate inbound B2B inquiries, and outperform competitors.",
        },
        {
          title: "Android Apps & Custom Systems",
          desc: "Bespoke Android apps and back-office management platforms (ERP, POS, inventory, CRM) custom-built around your exact operational workflows.",
        },
        {
          title: "AI Setup & Automation",
          desc: "Practical AI integration including 24/7 autonomous customer service chatbots, content generation pipelines, and direct LLM API connections.",
        },
        {
          title: "Web SEO & Google Maps (GBP) Ranking",
          desc: "Proven search optimization driving your website to Google Page 1 and securing top placements in Google Maps Local 3-Pack searches.",
        },
      ]
    : [
        {
          title: "Website Sekolah & Portal Desa",
          desc: "Pembuatan portal web resmi berstandar tinggi untuk sekolah dan lembaga desa dengan tampilan bersih, aman, mudah diakses warga, dan ramah smartphone.",
        },
        {
          title: "Platform E-Learning / LMS",
          desc: "Sistem manajemen pembelajaran online lengkap dengan fitur kelas video, kuis & ujian online terstruktur, serta penerbitan sertifikat digital otomatis.",
        },
        {
          title: "Website Company Profile & Bisnis",
          desc: "Website profil perusahaan profesional yang elegan, kencang, dan dirancang khusus untuk meningkatkan konversi penjualan dan kepercayaan calon klien.",
        },
        {
          title: "Aplikasi Android & Custom Sistem",
          desc: "Pengembangan aplikasi Android dan sistem informasi manajemen berbasis web (ERP, kasir, CRM, booking) sesuai alur kerja spesifik bisnis Anda.",
        },
        {
          title: "Setup AI & Otomasi Alur Kerja",
          desc: "Pemasangan teknologi AI cerdas untuk bisnis: chatbot layanan pelanggan 24 jam nonstop, automasi pembuatan konten, hingga integrasi API AI modern.",
        },
        {
          title: "Optimasi SEO & Google Maps / GBP",
          desc: "Strategi SEO organik dan optimasi Google Profile Bisnis (Google Maps) agar tempat usaha Anda mendominasi pencarian lokal teratas.",
        },
      ];

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-16">
      <JsonLd data={jsonLd} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-accent">
              {isEn ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{isEn ? "About" : "Tentang"}</li>
        </ol>
      </nav>

      {/* Main Header Persona */}
      <header className="mb-10 border-b border-line pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <span>✓ Profile & Track Record</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {isEn ? "About Tri Marzuki" : "Tentang Tri Marzuki"}
        </h1>
        <p className="mt-2 text-base font-semibold text-accent sm:text-xl">
          {isEn
            ? "Fullstack Software Developer, AI Integrator & Local SEO Strategist"
            : "Fullstack Web & App Developer, Setup AI & Spesialis Optimasi SEO"}
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          {isEn
            ? "Dedicated to helping businesses, schools, communities, and entrepreneurs bridge operational gaps and dominate search visibility through clean code, custom systems, and high-impact SEO."
            : "Berdedikasi membantu sekolah, instansi desa, perusahaan, dan UMKM berkembang secara digital melalui pembuatan website berkecepatan tinggi, sistem aplikasi terintegrasi, automasi AI, dan dominasi rangking Google."}
        </p>
      </header>

      {/* Bio & Story */}
      <div className="flex flex-col gap-10 text-foreground/90">
        <section className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {isEn ? "Background & Engineering Philosophy" : "Latar Belakang & Filosofi Kerja"}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted sm:text-base">
            <p>
              {isEn
                ? "My name is Tri Marzuki. Over the years, I have engineered diverse software solutions spanning from intuitive school portals and village administrative websites to complex LMS architectures, custom Android applications, and enterprise workflow management systems."
                : "Nama saya Tri Marzuki. Saya fokus mendalami software engineering, perancangan sistem informasi, dan optimasi mesin pencari (SEO). Saya percaya bahwa teknologi terbaik adalah teknologi yang benar-benar memecahkan masalah operasional dan mendatangkan pelanggan nyata bagi pemiliknya."}
            </p>
            <p>
              {isEn
                ? "Beyond writing clean and scalable code, my core specialization lies in technical Search Engine Optimization (SEO) and Google Business Profile (GBP / Google Maps) dominance. A website must not only look visually stunning—it must load in milliseconds, convert traffic into customers, and rank on Google Page 1."
                : "Bagi saya, website bukan sekadar etalase visual, tetapi aset digital yang wajib kencang (Core Web Vitals skor tinggi), aman, mudah dioperasikan, dan mampu menduduki ranking teratas di Google agar bisnis Anda selalu ditemukan oleh calon pembeli yang tepat."}
            </p>
          </div>
        </section>

        {/* Specialized Services Grid */}
        <section>
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {isEn ? "Core Expertise" : "Layanan Spesialisasi"}
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEn ? "What I Deliver" : "Solusi Yang Saya Kerjakan"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-line bg-surface p-5 transition hover:border-accent/40 hover:shadow-xs"
              >
                <h3 className="font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Clients Work With Tri Marzuki */}
        <section className="rounded-2xl border border-line bg-[#fafbfc] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {isEn ? "Why Collaborate Directly With Me?" : "Mengapa Bekerja Sama dengan Saya?"}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted sm:text-base">
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-accent">✓</span>
              <span>
                <strong>{isEn ? "Direct Developer Access:" : "Langsung ke Developer Asli:"}</strong>{" "}
                {isEn
                  ? "You communicate directly with the engineer building your system—no bloated agency layers, no miscommunicated briefs, and no hidden markups."
                  : "Anda berdiskusi langsung dengan programmer yang mengerjakan sistem Anda—tanpa perantara sales, tanpa birokrasi berbelit, dan tanpa biaya mark-up agensi."}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-accent">✓</span>
              <span>
                <strong>{isEn ? "Performance & Speed First:" : "Performa Cepat & Ringan:"}</strong>{" "}
                {isEn
                  ? "Every project is built using modern tech stacks like Next.js and TypeScript, ensuring instantaneous loading and superior user satisfaction."
                  : "Dibangun dengan framework modern Next.js dan TypeScript yang menghasilkan kecepatan load instan, hemat kuota, dan disukai Google."}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-accent">✓</span>
              <span>
                <strong>{isEn ? "Holistic SEO Strategy:" : "Strategi SEO Menyeluruh:"}</strong>{" "}
                {isEn
                  ? "Structured data (Schema.org), canonical URLs, OpenGraph, sitemaps, and local Google Maps optimization are baked in from day one."
                  : "Struktur data Schema JSON-LD, sitemap, meta tag, dan optimasi profil Google Maps sudah ditanamkan sejak hari pertama pembuatan."}
              </span>
            </li>
          </ul>
        </section>

        {/* Call to action */}
        <section className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-[#1d2327] to-[#2c3338] p-8 text-white sm:flex-row sm:p-10">
          <div>
            <h3 className="text-xl font-bold sm:text-2xl">
              {isEn ? "Ready to Discuss Your Project?" : "Siap Memulai Proyek Digital Anda?"}
            </h3>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              {isEn
                ? "Let's discuss how we can engineer your website, app, or boost your SEO."
                : "Konsultasikan ide website, aplikasi, sistem kustom, atau optimasi SEO Anda bersama saya."}
            </p>
          </div>
          <div className="shrink-0">
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={
                isEn
                  ? "Hi Tri Marzuki, I read your About page and want to discuss a project."
                  : "Halo Mas Tri Marzuki, saya membaca profil Anda dan ingin konsultasi proyek."
              }
              label={isEn ? "Chat with Tri Marzuki" : "Konsultasi via WhatsApp"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
