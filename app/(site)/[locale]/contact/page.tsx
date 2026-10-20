import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import JsonLd from "@/components/jsonld";
import { getContactSettings, getSiteSettings } from "@/lib/content";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const base = env.siteUrl || "http://localhost:3000";
  const site = await getSiteSettings();
  const title = locale === "en" ? "Contact" : "Kontak";

  return {
    title,
    description:
      locale === "en"
        ? `Contact ${site.site_name} — partnerships, questions, and feedback.`
        : `Hubungi ${site.site_name} — kolaborasi, pertanyaan, dan masukan.`,
    alternates: {
      canonical: `${base}/${locale}/contact`,
      languages: {
        id: `${base}/id/contact`,
        en: `${base}/en/contact`,
        "x-default": `${base}/${DEFAULT_LOCALE}/contact`,
      },
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const [site, contact] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
  ]);

  const en = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";

  const faq = en
    ? [
        {
          q: "How can I suggest an article topic?",
          a: "Send your topic suggestions via WhatsApp chat.",
        },
        {
          q: "How frequently is content updated?",
          a: "Articles are monitored and maintained continuously to stay accurate.",
        },
      ]
    : [
        {
          q: "Bagaimana cara mengirim saran artikel?",
          a: "Kirimkan ide atau permintaan topik melalui pesan WhatsApp.",
        },
        {
          q: "Apakah konten diperbarui berkala?",
          a: "Ya, artikel dipantau dan diperbarui secara berkala agar tetap akurat.",
        },
      ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${base}/${locale}/contact`,
        url: `${base}/${locale}/contact`,
        name: en ? "Contact" : "Kontak",
        isPartOf: { "@id": `${base}#website` },
        inLanguage: en ? "en" : "id-ID",
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

      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-accent">
              {en ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{en ? "Contact" : "Kontak"}</li>
        </ol>
      </nav>

      <div className="mb-8 border-b border-line pb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          {en ? "Contact Us" : "Hubungi Kami"}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {en
            ? `We welcome feedback, general inquiries, or partnership discussions with ${site.site_name}.`
            : `Kami siap mendengar masukan, pertanyaan, atau tawaran kerja sama dengan ${site.site_name}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-8">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              {en ? "Direct Chat" : "Chat Langsung"}
            </h2>
            <p className="mb-6 leading-relaxed text-muted">
              {en
                ? "For the fastest response, contact our team directly via WhatsApp during business hours."
                : "Untuk respons paling cepat, silakan hubungi tim kami langsung via WhatsApp pada jam kerja."}
            </p>
            <div className="flex flex-col gap-3 text-sm text-muted">
              <div>
                <strong className="block text-foreground">
                  {en ? "Operating Hours:" : "Waktu Operasional:"}
                </strong>
                {en ? "Monday – Friday: 09:00 – 18:00 (GMT+7)" : "Senin – Jumat: 09:00 – 18:00 WIB"}
              </div>
              <div>
                <strong className="block text-foreground">
                  {en ? "Location:" : "Lokasi:"}
                </strong>
                Indonesia
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={contact.whatsapp_message}
              label={en ? "Open WhatsApp Chat Now" : "Buka Chat WhatsApp Sekarang"}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border border-line p-8">
          <h2 className="text-xl font-bold text-foreground">
            {en ? "Frequently Asked Questions" : "Pertanyaan Sering Diajukan"}
          </h2>
          {faq.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
              <p className="mt-1 text-sm text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
