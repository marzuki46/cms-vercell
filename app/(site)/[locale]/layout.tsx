import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import { getContactSettings, getSiteSettings } from "@/lib/content";
import { env } from "@/lib/env";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  htmlLang,
  isLocale,
  ogLocale,
  type Locale,
} from "@/lib/i18n";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw;
  const site = await getSiteSettings();
  const base = env.siteUrl || "http://localhost:3000";

  const t = copy(locale);

  return {
    title: { default: site.site_name, template: `%s · ${site.site_name}` },
    description: t.tagline(site.site_name),
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
      url: `${base}/${locale}`,
      locale: ogLocale(locale),
      images: [
        {
          url: `${base}/api/og`,
          width: 1200,
          height: 630,
          alt: site.site_name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.site_name,
      description: t.tagline(site.site_name),
      images: [`${base}/api/og`],
    },
  };
}

function copy(locale: Locale) {
  const en = locale === "en";
  return {
    nav: en
      ? { home: "Home", blog: "Blog", about: "About", contact: "Contact" }
      : { home: "Beranda", blog: "Blog", about: "Tentang", contact: "Kontak" },
    tagline: (name: string) =>
      en
        ? `Articles, in-depth guides and practical insights from ${name}.`
        : `Artikel, panduan, dan wawasan terbaru dari ${name}.`,
    rights: en
      ? "All rights reserved."
      : "Seluruh hak cipta dilindungi.",
    description: (name: string) =>
      en
        ? `Official publishing platform of ${name}.`
        : `Portal informasi dan publikasi artikel resmi ${name}.`,
    notFound: en ? "Page not found." : "Halaman tidak ditemukan.",
  };
}

export default async function SiteLayout({ children, params }: Props & { children: React.ReactNode }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const [site, contact] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
  ]);
  const t = copy(locale);
  const base = env.siteUrl || "http://localhost:3000";

  return (
    <div lang={htmlLang(locale)} className="flex min-h-screen flex-col">
      {/* Sync document <html> lang with the active locale immediately */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${locale === "en" ? "en" : "id"}";`,
        }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
      >
        {t.notFound === "Page not found." ? "Skip to content" : "Lompat ke konten"}
      </a>

      <SiteHeader
        siteName={site.site_name}
        locale={locale}
        navLabels={t.nav}
        whatsappNumber={contact.whatsapp_number}
        whatsappMessage={contact.whatsapp_message}
        whatsappBtnLabel={locale === "en" ? "Chat via WhatsApp" : "Konsultasi WhatsApp"}
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <WhatsAppChatButton
        variant="floating"
        number={contact.whatsapp_number}
        message={contact.whatsapp_message}
      />

      <footer className="mt-16 border-t border-line bg-surface/50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-base font-bold text-foreground">
              {site.site_name}
            </span>
            <p className="max-w-sm text-xs text-muted">
              {t.description(site.site_name)}
            </p>
            <p className="mt-2 text-xs text-muted">
              © {new Date().getFullYear()} {site.site_name}. {t.rights}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-muted">
            <Link href={`/${locale}/blog`} className="hover:text-foreground">
              {locale === "en" ? "All articles" : "Semua Artikel"}
            </Link>
            <Link href={`/${locale}/about`} className="hover:text-foreground">
              {t.nav.about}
            </Link>
            <Link href={`/${locale}/contact`} className="hover:text-foreground">
              {t.nav.contact}
            </Link>
            <Link href={`${base}/sitemap.xml`} className="hover:text-foreground">
              Sitemap
            </Link>
            <Link href={`${base}/rss.xml`} className="hover:text-foreground">
              RSS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
