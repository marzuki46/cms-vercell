import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteSettings } from "@/lib/content";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Root layout only renders the document shell. Public chrome (header, footer,
 * floating WhatsApp) lives in `app/(site)/[locale]/layout.tsx` so the admin
 * dashboard never inherits public navigation.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

function parseGoogleVerificationToken(val?: string | null): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  const match = trimmed.match(/content=["']([^"']+)["']/i);
  if (match) return match[1].trim();
  return trimmed.replace(/^<meta[^>]*content=["']?|["']?\s*\/?>$/gi, "").trim() || undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const baseUrl = env.siteUrl || "http://localhost:3000";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: site.site_name,
      template: `%s · ${site.site_name}`,
    },
    description: `Artikel, panduan, dan wawasan terbaru dari ${site.site_name}.`,
    alternates: {
      types: { "application/rss+xml": "/rss.xml" },
    },
    openGraph: {
      type: "website",
      siteName: site.site_name,
      url: baseUrl,
      locale: "id_ID",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: parseGoogleVerificationToken(site.google_site_verification || env.googleSiteVerification),
    },
  };
}
