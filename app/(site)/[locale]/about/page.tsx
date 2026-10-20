import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/jsonld";
import { getSiteSettings } from "@/lib/content";
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
  const title = locale === "en" ? `About ${site.site_name}` : `Tentang ${site.site_name}`;

  return {
    title,
    description:
      locale === "en"
        ? `Who we are and the editorial standards behind ${site.site_name}.`
        : `Siapa kami dan standar editorial di balik ${site.site_name}.`,
    alternates: {
      canonical: `${base}/${locale}/about`,
      languages: {
        id: `${base}/id/about`,
        en: `${base}/en/about`,
        "x-default": `${base}/${DEFAULT_LOCALE}/about`,
      },
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const site = await getSiteSettings();
  const en = locale === "en";
  const base = env.siteUrl || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${base}/${locale}/about`,
    url: `${base}/${locale}/about`,
    name: en ? `About ${site.site_name}` : `Tentang ${site.site_name}`,
    isPartOf: { "@id": `${base}#website` },
    inLanguage: en ? "en" : "id-ID",
    about: { "@id": `${base}#organization` },
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
          <li className="text-foreground">{en ? "About" : "Tentang"}</li>
        </ol>
      </nav>

      <div className="mb-8 border-b border-line pb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          {en ? `About ${site.site_name}` : `Tentang ${site.site_name}`}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {en
            ? `Official publishing platform dedicated to delivering authoritative, research-backed insights for our audience.`
            : `Pusat publikasi konten berkualitas tinggi yang dirancang untuk memberikan informasi kredibel dan terpercaya bagi pembaca.`}
        </p>
      </div>

      <div className="flex max-w-none flex-col gap-6 text-base leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            {en ? "Our Mission" : "Misi Kami"}
          </h2>
          <p className="leading-relaxed text-muted">
            {en
              ? `${site.site_name} delivers updated knowledge, in-depth analysis, and well-researched insights tailored to contemporary industry needs. We bridge complex topics with clear, actionable narratives.`
              : `${site.site_name} hadir dengan komitmen menyajikan informasi terupdate, panduan mendalam, dan wawasan berbasis riset yang relevan dengan kebutuhan audiens modern. Kami memadukan strategi riset mendalam dengan penyajian yang mudah dipahami.`}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-3 text-xl font-bold text-foreground">
            {en ? "Editorial Standards" : "Standar Kualitas Konten"}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-muted">
            <li>
              <strong>
                {en ? "Accurate & Verified:" : "Akurat & Terverifikasi:"}
              </strong>{" "}
              {en
                ? "Every article is supported by rigorous research and verifiable data sources."
                : "Setiap artikel disusun melalui riset data dan fakta kredibel."}
            </li>
            <li>
              <strong>
                {en ? "Practical & Objective:" : "Relevan & Terkini:"}
              </strong>{" "}
              {en
                ? "Focused on addressing real-world queries with actionable guidance."
                : "Membahas topik-topik krusial yang relevan untuk pembaca."}
            </li>
            <li>
              <strong>
                {en ? "Structured Long-Form:" : "Struktur Lengkap & Mudah Dibaca:"}
              </strong>{" "}
              {en
                ? "Crafted with clean typography, clear headings, and reader-first accessibility."
                : "Ditulis dalam format long-form dengan visualisasi informasi yang ramah pembaca."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            {en ? "Get in Touch" : "Hubungi Tim Kami"}
          </h2>
          <p className="leading-relaxed text-muted">
            {en ? (
              <>
                Have questions, topic suggestions, or partnership inquiries? Reach us
                via our{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="font-semibold text-accent underline"
                >
                  contact page
                </Link>{" "}
                or direct WhatsApp support.
              </>
            ) : (
              <>
                Apakah Anda memiliki pertanyaan, saran topik, atau peluang kolaborasi?{" "}
                Jangan ragu untuk menghubungi kami langsung melalui halaman{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="font-semibold text-accent underline"
                >
                  Kontak Kami
                </Link>{" "}
                atau via layanan pesan WhatsApp resmi kami.
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
