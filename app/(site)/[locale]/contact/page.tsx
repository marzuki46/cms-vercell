import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { getContactSettings, getSiteSettings } from "@/lib/content";
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
    ? "Contact Tri Marzuki — Web & App Developer, AI Setup & SEO Consultant"
    : "Hubungi Tri Marzuki — Konsultasi Website, Aplikasi, AI & Jasa SEO";

  const description = isEn
    ? "Get in touch directly with Tri Marzuki for web development (Schools, LMS, Company Profiles, Village Portals), Android apps, custom management systems, AI setup, and Google Maps / SEO optimization."
    : "Hubungi langsung Tri Marzuki untuk konsultasi dan pembuatan website sekolah, LMS, company profile, portal desa, aplikasi Android, sistem custom, setup AI, dan optimasi SEO Google Maps.";

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${locale}/contact`,
      languages: {
        id: `${base}/id/contact`,
        en: `${base}/en/contact`,
        "x-default": `${base}/${DEFAULT_LOCALE}/contact`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${base}/${locale}/contact`,
      type: "website",
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const isEn = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";

  const [site, contact] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
  ]);

  const faq = isEn
    ? [
        {
          q: "What digital services does Tri Marzuki specialize in?",
          a: "I build responsive School Websites, Learning Management Systems (LMS), Company Profiles, Village Portals, Android Apps, Custom Business Management Systems, Autonomous AI Chatbot Setup, and Google Maps (GBP) / Web SEO optimization.",
        },
        {
          q: "How long does a website or app development project take?",
          a: "Standard company profiles or school websites typically take 5–14 days. Complex LMS, custom systems, or Android apps usually take 2–4 weeks depending on the specification.",
        },
        {
          q: "Will my website be search engine optimized (SEO)?",
          a: "Yes. Every website is built with clean HTML5 semantics, high-speed Core Web Vitals, Schema.org JSON-LD structured data, and keyword targeting from day one.",
        },
        {
          q: "Can I consult about my project requirements before deciding?",
          a: "Absolutely. Free consultations are available directly via WhatsApp so we can map out your requirements and find the most cost-effective solution.",
        },
      ]
    : [
        {
          q: "Layanan apa saja yang dilayani oleh Tri Marzuki?",
          a: "Saya melayani jasa pembuatan website sekolah, platform LMS, company profile, portal desa, aplikasi Android, pembuatan sistem manajemen custom, setup otomasi AI, serta jasa optimasi SEO website dan Google Maps (Google My Business).",
        },
        {
          q: "Berapa lama proses pengerjaan website atau aplikasi?",
          a: "Untuk website company profile atau sekolah berkisar 5–14 hari kerja. Untuk sistem kustom, LMS, atau aplikasi Android membutuhkan 2–4 minggu sesuai kompleksitas fitur.",
        },
        {
          q: "Apakah website yang dibuat sudah langsung dioptimasi SEO?",
          a: "Ya. Setiap website langsung disiapkan dengan arsitektur SEO on-page: kecepatan tinggi, struktur heading ramah Google, sitemap XML, schema markup JSON-LD, dan meta tags lengkap.",
        },
        {
          q: "Apakah saya bisa konsultasi terlebih dahulu sebelum memesan?",
          a: "Tentu saja. Konsultasi gratis langsung via WhatsApp untuk mendiskusikan kebutuhan sistem, anggaran, dan solusi teknologi paling efisien untuk bisnis Anda.",
        },
      ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${base}/${locale}/contact`,
        url: `${base}/${locale}/contact`,
        name: isEn ? "Contact Tri Marzuki" : "Hubungi Tri Marzuki",
        isPartOf: { "@id": `${base}#website` },
        inLanguage: isEn ? "en" : "id-ID",
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

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
          <li className="text-foreground">{isEn ? "Contact" : "Kontak"}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-10 border-b border-line pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <span>💬 Direct Consultation</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {isEn ? "Contact Tri Marzuki" : "Hubungi Tri Marzuki"}
        </h1>
        <p className="mt-3 text-base text-muted sm:text-lg">
          {isEn
            ? "Ready to build your website, Android app, management system, or dominate Google search? Let's discuss your project directly."
            : "Siap membangun website sekolah, LMS, company profile, portal desa, aplikasi Android, custom sistem, atau mendominasi pencarian Google Maps? Hubungi saya langsung."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Direct WhatsApp Box */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-7 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📱</span>
              <h2 className="text-xl font-bold text-foreground">
                {isEn ? "Fast WhatsApp Consultation" : "Konsultasi Cepat WhatsApp"}
              </h2>
            </div>
            <p className="mb-6 text-xs sm:text-sm leading-relaxed text-muted">
              {isEn
                ? "For instant assistance and project discussions, message me directly on WhatsApp. I usually respond within a few minutes during active hours."
                : "Untuk respon paling cepat dan diskusi teknis proyek secara langsung, silakan chat saya via WhatsApp."}
            </p>

            <div className="flex flex-col gap-3 rounded-xl border border-line/60 bg-[#fbfbfd] p-4 text-xs text-muted">
              <div>
                <strong className="block text-foreground font-semibold">
                  {isEn ? "Developer Contact:" : "Kontak Pengembang:"}
                </strong>
                Tri Marzuki (Fullstack Developer & SEO Specialist)
              </div>
              <div>
                <strong className="block text-foreground font-semibold">
                  {isEn ? "Active Hours:" : "Jam Operasional:"}
                </strong>
                {isEn ? "Monday – Saturday: 08:00 – 21:00 (WIB / GMT+7)" : "Senin – Sabtu: 08:00 – 21:00 WIB"}
              </div>
              <div>
                <strong className="block text-foreground font-semibold">
                  {isEn ? "Location:" : "Lokasi & Layanan:"}
                </strong>
                {isEn
                  ? "Solo / Soloraya, Central Java & Remote Worldwide"
                  : "Solo / Soloraya & Melayani Klien Seluruh Indonesia"}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={
                isEn
                  ? "Hello Tri Marzuki, I would like to consult about website / system development."
                  : "Halo Mas Tri Marzuki, saya ingin konsultasi mengenai pembuatan website / sistem / SEO."
              }
              label={isEn ? "Chat Tri Marzuki on WhatsApp" : "Hubungi Tri Marzuki via WhatsApp"}
            />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-7 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h2 className="text-lg font-bold text-foreground">
              {isEn ? "Frequently Asked Questions" : "Pertanyaan Sering Diajukan (FAQ)"}
            </h2>
          </div>
          <div className="space-y-4">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl border border-line/70 bg-surface p-4">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">{f.q}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
