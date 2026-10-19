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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteSettings();

  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Lompat ke konten
        </a>
        <header className="border-b border-line bg-background/80 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight hover:text-accent transition flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block"></span>
              <span>{site.site_name}</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-muted">
              <Link href="/" className="hover:text-foreground transition">
                Beranda
              </Link>
              <Link href="/blog" className="hover:text-foreground transition">
                Blog
              </Link>
              <Link href="/about" className="hover:text-foreground transition">
                Tentang
              </Link>
              <Link href="/contact" className="hover:text-foreground transition">
                Kontak
              </Link>
              <Link
                href="/admin"
                className="text-accent font-semibold px-3 py-1 rounded-full border border-accent/30 hover:bg-accent hover:text-white transition"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-line bg-surface/50 mt-16">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-base font-bold text-foreground">{site.site_name}</span>
              <p className="text-xs text-muted max-w-sm">
                Platform publikasi konten SEO otomatis dengan model CMS modern bergaya WordPress ringan.
              </p>
              <p className="text-xs text-muted mt-2">© {new Date().getFullYear()} {site.site_name}. Hak Cipta Dilindungi.</p>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted">
              <Link href="/blog" className="hover:text-foreground">
                Semua Artikel
              </Link>
              <Link href="/about" className="hover:text-foreground">
                Tentang
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Kontak
              </Link>
              <Link href="/sitemap.xml" className="hover:text-foreground">
                Sitemap
              </Link>
              <Link href="/rss.xml" className="hover:text-foreground">
                RSS Feed
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
