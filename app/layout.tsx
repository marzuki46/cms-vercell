import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

function siteUrl() {
  return env.siteUrl || "http://localhost:3000";
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const baseUrl = siteUrl();
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: site.site_name,
      template: `%s · ${site.site_name}`,
    },
    description: `Artikel, panduan, dan wawasan terbaru dari ${site.site_name}.`,
    alternates: {
      canonical: "/",
      types: { "application/rss+xml": "/rss.xml" },
    },
    openGraph: {
      type: "website",
      siteName: site.site_name,
      url: baseUrl,
      locale: "id_ID",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Lompat ke konten
        </a>
        <header className="border-b border-line">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight hover:text-accent"
            >
              Content Autopilot
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/blog" className="hover:text-accent">
                Blog
              </Link>
              <Link href="/sitemap.xml" className="hover:text-accent">
                Sitemap
              </Link>
              <Link href="/admin" className="hover:text-accent">
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Content Autopilot.</p>
            <p className="flex gap-4">
              <Link href="/blog" className="hover:text-accent">
                Blog
              </Link>
              <Link href="/sitemap.xml" className="hover:text-accent">
                Sitemap
              </Link>
              <Link href="/rss.xml" className="hover:text-accent">
                RSS
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
