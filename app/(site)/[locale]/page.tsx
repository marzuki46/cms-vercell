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
  getContactSettings,
  getSiteSettings,
  getAuthorBySlug,
} from "@/lib/content";

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const site = await getSiteSettings();
  const base = env.siteUrl || "http://localhost:3000";

  const isEn = locale === "en";
  const title = isEn
    ? "Tri Marzuki — Fullstack Web & App Developer, AI Setup & SEO Specialist"
    : "Tri Marzuki — Jasa Pembuatan Website, Aplikasi, Setup AI & SEO Spesialis";

  const description = isEn
    ? "Hi, I am Tri Marzuki. Providing professional Web Development (Schools, LMS, Company Profile, Village Portal), Android Apps, Custom Systems, AI Integration, Web SEO & Google Business Profile (GMB) Optimization."
    : "Halo, saya Tri Marzuki. Melayani jasa pembuatan website profesional (sekolah, LMS, company profile, desa, portal bisnis), aplikasi Android, custom sistem, setup AI, optimasi SEO website & Google Maps / Google My Business (GBP).";

  const ogImage = `${base}/api/og?title=${encodeURIComponent(
    "Tri Marzuki — Developer & SEO Specialist",
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
      siteName: "Tri Marzuki Portfolio & Tech Services",
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

  const [site, articles, contact, author] = await Promise.all([
    getSiteSettings(),
    getPublishedArticles(6, 0, locale),
    getContactSettings(),
    getAuthorBySlug("admin", locale),
  ]);

  const base = env.siteUrl || "http://localhost:3000";
  const en = locale === "en";
  const t = getPageContent(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${base}/${locale}#person`,
        name: "Tri Marzuki",
        jobTitle: en
          ? "Fullstack Software Engineer & SEO Specialist"
          : "Software Developer & Spesialis Optimasi SEO",
        url: `${base}/${locale}`,
        image: author?.avatar_url || `${base}/api/og`,
        description: t.heroBio,
        knowsAbout: [
          "Web Development",
          "Learning Management System (LMS)",
          "Company Profile Websites",
          "Village & Community Portals",
          "Android Mobile Apps",
          "System Architecture & Automation",
          "AI Setup & Workflow Integration",
          "Technical SEO & Content Strategy",
          "Google Business Profile / Google Maps Local SEO",
        ],
        worksFor: {
          "@type": "Organization",
          name: site.site_name || "Tri Marzuki Studio",
          url: base,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}#website`,
        url: base,
        name: `${site.site_name} — Tri Marzuki`,
        inLanguage: en ? "en" : "id-ID",
      },
    ],
  };

  return (
    <div className="flex flex-col bg-background text-foreground">
      <JsonLd data={jsonLd} />

      {/* Hero Personal Branding Section */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-[#f8fafc] via-[#ffffff] to-[#ffffff] py-16 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="flex flex-col-reverse items-center justify-between gap-10 md:flex-row md:items-start">
            {/* Left Column: Greeting, Role & Bio */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.heroBadge}</span>
              </div>

              <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-5xl">
                {t.greeting}{" "}
                <span className="text-accent underline decoration-accent/30 underline-offset-8">
                  Tri Marzuki
                </span>
                .
              </h1>

              <p className="mt-4 text-base font-medium text-accent sm:text-xl">
                {t.heroHeadline}
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                {t.heroBio}
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 md:justify-start">
                <WhatsAppChatButton
                  variant="inline"
                  number={contact.whatsapp_number}
                  message={
                    en
                      ? "Hi Tri Marzuki, I would like to consult about website/app development or SEO."
                      : "Halo Mas Tri Marzuki, saya ingin konsultasi mengenai pembuatan website / sistem / SEO."
                  }
                  label={t.heroCtaWa}
                />
                <a
                  href="#services"
                  className="rounded-full border border-line bg-surface px-5 py-2.5 text-xs font-semibold text-foreground shadow-xs transition hover:border-accent hover:text-accent"
                >
                  {t.heroCtaServices}
                </a>
                <Link
                  href={`/${locale}/blog`}
                  className="rounded-full border border-transparent px-4 py-2.5 text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  {t.heroCtaBlog}
                </Link>
              </div>

              {/* Credibility metric pills */}
              <div className="mt-10 grid grid-cols-2 gap-3 border-t border-line/70 pt-6 sm:grid-cols-4">
                {t.metrics.map((m) => (
                  <div key={m.label} className="flex flex-col">
                    <span className="text-2xl font-extrabold text-foreground">{m.val}</span>
                    <span className="text-xs text-muted font-medium">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual Persona Badge */}
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl border-2 border-accent/20 bg-gradient-to-tr from-accent/20 via-accent/5 to-transparent p-2 shadow-md sm:h-44 sm:w-44">
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-card text-center text-4xl shadow-inner sm:text-5xl">
                  💻
                </div>
                <div className="absolute -bottom-2.5 -right-2.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold text-emerald-700 shadow-xs">
                  ✓ Verified Pro
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm font-bold text-foreground">Tri Marzuki</div>
                <div className="text-xs text-muted">Web, App & Local SEO Engineer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Showcase Section */}
      <section id="services" className="scroll-mt-14 border-b border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {t.servicesBadge}
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t.servicesTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              {t.servicesSubtitle}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.servicesList.map((s) => (
              <div
                key={s.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg"
              >
                <div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-accent">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                    {s.desc}
                  </p>

                  <ul className="mt-4 space-y-1.5 border-t border-line/50 pt-3 text-xs text-muted">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-1.5">
                        <span className="text-accent font-bold">✓</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <WhatsAppChatButton
                    variant="inline"
                    number={contact.whatsapp_number}
                    message={
                      en
                        ? `Hi Tri Marzuki, I want to discuss about ${s.title}.`
                        : `Halo Mas Tri Marzuki, saya berminat konsultasi jasa: ${s.title}.`
                    }
                    label={t.serviceConsultBtn}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Tri Marzuki Section */}
      <section className="border-b border-line bg-[#fafbfc] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {t.whyBadge}
            </span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {t.whyTitle}
            </h2>
            <p className="mt-2 text-xs text-muted sm:text-sm">
              {t.whySubtitle}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.whyList.map((w) => (
              <div
                key={w.title}
                className="flex flex-col rounded-xl border border-line bg-card p-5 shadow-2xs"
              >
                <div className="text-3xl mb-3">{w.icon}</div>
                <h4 className="text-sm font-bold text-foreground">{w.title}</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles & Tech Insights Section */}
      <section className="border-b border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                {t.articlesBadge}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {t.articlesTitle}
              </h2>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {t.articlesSubtitle}
              </p>
            </div>
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline"
            >
              <span>{t.articlesViewAll}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-12 text-center">
              <p className="text-base font-semibold text-foreground">
                {en ? "Articles are being written." : "Artikel panduan sedang dalam proses penulisan."}
              </p>
              <p className="mt-1 text-xs text-muted">
                {en ? "Please check back shortly." : "Silakan cek kembali beberapa saat lagi."}
              </p>
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

      {/* Direct Contact & Collaboration CTA */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-8 text-white shadow-xl sm:p-12 md:flex-row">
            <div className="max-w-xl text-center md:text-left">
              <span className="inline-block rounded-full bg-accent/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200">
                {t.ctaBadge}
              </span>
              <h3 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                {t.ctaTitle}
              </h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-300">
                {t.ctaSubtitle}
              </p>
            </div>
            <div className="shrink-0">
              <WhatsAppChatButton
                variant="inline"
                number={contact.whatsapp_number}
                message={
                  en
                    ? "Hi Tri Marzuki, let's discuss my project."
                    : "Halo Mas Tri Marzuki, saya ingin diskusi proyek digital saya."
                }
                label={t.ctaWaBtn}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getPageContent(locale: Locale) {
  const en = locale === "en";

  if (en) {
    return {
      heroBadge: "Available for Projects & Consultations",
      greeting: "Hello, I am",
      heroHeadline: "Fullstack Web & Mobile Developer, AI Setup & SEO Strategist",
      heroBio:
        "Passionate about building scalable digital solutions. I engineer high-speed websites (Schools, LMS, Company Profiles, Village Portals), robust Android apps, custom management systems, automated AI workflows, and high-ROI Search Engine & Google Business Profile (Maps) optimization.",
      heroCtaWa: "Consult on WhatsApp",
      heroCtaServices: "Explore Services ↓",
      heroCtaBlog: "Read Insights →",
      metrics: [
        { val: "100%", valText: "Custom", label: "Clean Code & Fast" },
        { val: "Top 3", valText: "Local", label: "Google Maps Rank" },
        { val: "Core", valText: "SEO", label: "White-Hat Growth" },
        { val: "24/7", valText: "Support", label: "Direct Developer Contact" },
      ],

      servicesBadge: "Specialized Services",
      servicesTitle: "Complete Digital & Technology Solutions",
      servicesSubtitle:
        "Every solution is built with security, fast loading times, and search engine discoverability from day one.",
      serviceConsultBtn: "Consult this Service",
      servicesList: [
        {
          icon: "🏫",
          title: "School Websites & Village Portals",
          desc: "Informative, clean, and official digital portals designed specifically for educational institutions, schools, and local village communities (Desa Digital).",
          points: [
            "Official domain integration & student data",
            "Responsive, accessible, and citizen-friendly",
            "News, announcement boards, and gallery",
          ],
        },
        {
          icon: "🎓",
          title: "Learning Management System (LMS)",
          desc: "Interactive e-learning platforms for schools, courses, and corporate training with quizzes, course tracking, and automated certifications.",
          points: [
            "Student & teacher role management",
            "Video lessons, exams & grading system",
            "Automated certificates & progress reports",
          ],
        },
        {
          icon: "🏢",
          title: "Company Profile & Business Portals",
          desc: "High-converting corporate websites tailored to build brand authority, generate inbound leads, and establish instant trust with prospective clients.",
          points: [
            "Bespoke UI/UX reflecting brand identity",
            "Fast Core Web Vitals performance (100 score)",
            "Integrated lead capture & WhatsApp direct CTA",
          ],
        },
        {
          icon: "📱",
          title: "Android Apps & Custom Systems",
          desc: "End-to-end native & hybrid Android application development and tailored business back-office ERP/CRM systems to automate operational friction.",
          points: [
            "Native Android & cross-platform performance",
            "Custom database & secure API architecture",
            "Real-time dashboards, reports & notifications",
          ],
        },
        {
          icon: "🤖",
          title: "AI Setup & Automation Workflows",
          desc: "Integrating state-of-the-art AI (LLM, chatbots, automated content, customer support workflows) directly into your website and internal workflow.",
          points: [
            "Customer service AI Chatbots 24/7",
            "Automated content generation pipelines",
            "API integration with OpenAI / 9Router / Gemini",
          ],
        },
        {
          icon: "📍",
          title: "Web SEO & Google Maps / GBP Optimization",
          desc: "Dominating organic search results and Google Maps Local 3-Pack so customers in your area find your business first when searching for services.",
          points: [
            "Technical SEO, Schema markup & speed tuning",
            "Google Business Profile (GMB) rank boost",
            "Local citations, reviews & keyword strategy",
          ],
        },
      ],

      whyBadge: "Why Choose Me",
      whyTitle: "Direct Collaboration with a Real Developer",
      whySubtitle: "No middlemen, no bloated agency markups. Clean code, timely delivery, and clear communication.",
      whyList: [
        {
          icon: "⚡",
          title: "Fast & Lightweight",
          desc: "Crafted with modern tech stacks like Next.js, TypeScript, and Tailwind CSS for superior speed.",
        },
        {
          icon: "🎯",
          title: "SEO-First Architecture",
          desc: "Engineered from the ground up to rank high on Google and drive organic buyer intent traffic.",
        },
        {
          icon: "🛡️",
          title: "Secure & Maintainable",
          desc: "Best-practice database security, sanitization, and scalable system infrastructure.",
        },
        {
          icon: "🤝",
          title: "Transparent & Long-Term",
          desc: "Clear milestone updates, direct developer consultation, and continuous post-launch support.",
        },
      ],

      articlesBadge: "Knowledge Base & Insights",
      articlesTitle: "Latest Articles by Tri Marzuki",
      articlesSubtitle: "Tutorials, technical breakdowns, SEO strategies, and software development guides.",
      articlesViewAll: "View All Articles",

      ctaBadge: "Ready to Build Something Great?",
      ctaTitle: "Let's Bring Your Digital Vision to Life",
      ctaSubtitle:
        "Whether you need a new website, a custom management system, Android application, AI workflow, or local SEO dominance, I'm here to help.",
      ctaWaBtn: "Chat with Tri Marzuki via WhatsApp",
    };
  }

  // Indonesian Version (Default)
  return {
    heroBadge: "Siap Melayani Konsultasi & Pembuatan Proyek",
    greeting: "Halo, kenalkan namaku",
    heroHeadline: "Fullstack Web & App Developer, Setup AI & SEO Spesialis",
    heroBio:
      "Senang mengulik programming, rancang sistem, dan optimasi digital. Saya siap membantu Anda membuat website berkualitas (sekolah, LMS, company profile, desa), aplikasi Android, pembuatan sistem & aplikasi custom, setup otomasi AI, hingga optimasi SEO website dan Google Maps / Google My Business (GMB) agar bisnis Anda kebanjiran pelanggan.",
    heroCtaWa: "Konsultasi WhatsApp Sekarang",
    heroCtaServices: "Lihat Layanan Jasa ↓",
    heroCtaBlog: "Baca Artikel Edukasi →",
    metrics: [
      { val: "100%", valText: "Custom", label: "Cepat & Rapi" },
      { val: "Top 3", valText: "Maps", label: "Google Maps Lokal" },
      { val: "White-Hat", valText: "SEO", label: "Optimasi Berkelanjutan" },
      { val: "Langsung", valText: "Developer", label: "Bebas Biaya Perantara" },
    ],

    servicesBadge: "Layanan & Keahlian",
    servicesTitle: "Jasa Pembuatan Website, Sistem & Optimasi SEO",
    servicesSubtitle:
      "Solusi teknologi lengkap dari hulu ke hilir untuk mendigitalkan bisnis, instansi pendidikan, UMKM, maupun lembaga desa Anda.",
    serviceConsultBtn: "Konsultasikan Layanan Ini",
    servicesList: [
      {
        icon: "🏫",
        title: "Website Sekolah & Portal Desa",
        desc: "Jasa pembuatan website resmi untuk instansi sekolah (SD, SMP, SMA, SMK, Kampus) dan website desa digital yang informatif, resmi, dan mudah dikelola perangkat desa.",
        points: [
          "Domain resmi (.sch.id / .desa.id / .com)",
          "Profil, info PPDB, agenda kegiatan & galeri",
          "Tampilan responsif, cepat diakses dari HP",
        ],
      },
      {
        icon: "🎓",
        title: "Platform E-Learning / LMS",
        desc: "Pembuatan Learning Management System (LMS) modern untuk sekolah, bimbingan belajar, kursus online, maupun pelatihan internal perusahaan.",
        points: [
          "Manajemen materi video, modul & ujian/kuis online",
          "Akses bertingkat: Admin, Guru/Pengajar, dan Siswa",
          "Sertifikat otomatis & rekap nilai akurat",
        ],
      },
      {
        icon: "🏢",
        title: "Website Company Profile & Bisnis",
        desc: "Website profil perusahaan profesional yang elegan, kredibel, dan dirancang khusus untuk meningkatkan konversi penjualan dan kepercayaan calon klien.",
        points: [
          "Desain eksklusif mencerminkan identitas brand",
          "Skor Google PageSpeed kencang (90-100)",
          "Tombol WhatsApp interaktif langsung terhubung sales",
        ],
      },
      {
        icon: "📱",
        title: "Aplikasi Android & Pembuatan Sistem",
        desc: "Pengembangan aplikasi Android dan sistem informasi manajemen berbasis web (ERP, inventaris, kasir, CRM, booking) sesuai kebutuhan alur kerja unik Anda.",
        points: [
          "Aplikasi Android stabil & user-friendly",
          "Database aman dan arsitektur REST API modern",
          "Laporan otomatis, export data & monitoring real-time",
        ],
      },
      {
        icon: "🤖",
        title: "Setup AI & Otomasi Workflow",
        desc: "Integrasikan kecerdasan buatan (Artificial Intelligence) ke dalam bisnis Anda: asisten chatbot pintar 24 jam, automasi penulisan artikel, hingga integrasi API AI.",
        points: [
          "Chatbot customer service AI otomatis",
          "Integrasi LLM OpenAI / 9Router / Claude / Gemini",
          "Otomasi kerja harian hemat waktu & biaya operasional",
        ],
      },
      {
        icon: "📍",
        title: "Jasa SEO & Optimasi Google Maps / GBP",
        desc: "Menaikkan ranking website ke halaman 1 Google dan mengoptimasi Google My Business / Google Maps agar tempat usaha Anda mendominasi pencarian lokal.",
        points: [
          "Audit SEO On-Page, Off-Page & Schema Markup",
          "Optimasi Google Profile Bisnis tembus ranking teratas",
          "Riset kata kunci potensial pembeli lokal & nasional",
        ],
      },
    ],

    whyBadge: "Kelebihan Bekerja Sama",
    whyTitle: "Komunikasi Langsung dengan Developer Asli",
    whySubtitle: "Bukan perantara atau sales pihak ketiga. Setiap baris kode dan strategi ditangani langsung secara profesional.",
    whyList: [
      {
        icon: "⚡",
        title: "Loading Super Ringan",
        desc: "Dibangun dengan framework modern Next.js yang menjamin performa website cepat dan hemat kuota pengguna.",
      },
      {
        icon: "📈",
        title: "Berorientasi SEO Google",
        desc: "Struktur heading, metadata, sitemap, dan schema markup disiapkan lengkap agar mudah ditemukan mesin pencari.",
      },
      {
        icon: "🔒",
        title: "Keamanan Terjamin",
        desc: "Menerapkan best-practice keamanan data, proteksi serangan spam, dan enkripsi SSL HTTPS.",
      },
      {
        icon: "🤝",
        title: "Dukungan & Panduan Jelas",
        desc: "Disediakan panduan penggunaan dashboard dan pendampingan teknis setelah proyek selesai.",
      },
    ],

    articlesBadge: "Wawasan & Edukasi",
    articlesTitle: "Artikel & Panduan Terbaru oleh Tri Marzuki",
    articlesSubtitle: "Kumpulan ulasan teknis, tips pemrograman, strategi SEO, dan tren teknologi terupdate.",
    articlesViewAll: "Lihat Semua Artikel",

    ctaBadge: "Mulai Proyek Digital Anda Hari Ini",
    ctaTitle: "Punya Ide atau Kebutuhan Website & Sistem?",
    ctaSubtitle:
      "Diskusikan kebutuhan Anda bersama Tri Marzuki. Mulai dari website sekolah, company profile, aplikasi, setup AI, hingga optimasi Google Maps siap saya eksekusi dengan hasil terbaik.",
    ctaWaBtn: "Konsultasi Langsung via WhatsApp",
  };
}
