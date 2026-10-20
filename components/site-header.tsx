"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPPORTED_LOCALES, htmlLang, type Locale } from "@/lib/i18n";

interface Props {
  siteName: string;
  locale: Locale;
  navLabels: {
    home: string;
    blog: string;
    about: string;
    contact: string;
  };
  whatsappNumber: string | null;
  whatsappMessage: string | null;
  whatsappBtnLabel: string;
}

export default function SiteHeader({
  siteName,
  locale,
  navLabels,
  whatsappNumber,
  whatsappMessage,
  whatsappBtnLabel,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}${
        whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""
      }`
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3.5 sm:py-4">
        {/* Brand */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight transition hover:text-accent"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
          <span className="truncate max-w-[200px] sm:max-w-none">{siteName}</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-5 text-sm font-medium text-muted">
            <Link
              href={`/${locale}`}
              className={`transition hover:text-foreground ${
                pathname === `/${locale}` ? "text-accent font-semibold" : ""
              }`}
            >
              {navLabels.home}
            </Link>
            <Link
              href={`/${locale}/blog`}
              className={`transition hover:text-foreground ${
                pathname.startsWith(`/${locale}/blog`) ? "text-accent font-semibold" : ""
              }`}
            >
              {navLabels.blog}
            </Link>
            <Link
              href={`/${locale}/about`}
              className={`transition hover:text-foreground ${
                pathname.startsWith(`/${locale}/about`) ? "text-accent font-semibold" : ""
              }`}
            >
              {navLabels.about}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className={`transition hover:text-foreground ${
                pathname.startsWith(`/${locale}/contact`) ? "text-accent font-semibold" : ""
              }`}
            >
              {navLabels.contact}
            </Link>
          </nav>

          {/* Language Switcher */}
          <div
            className="flex items-center rounded-full border border-line text-xs font-semibold p-0.5 bg-muted/5"
            role="group"
            aria-label="Language selector"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                hrefLang={htmlLang(l)}
                className={`rounded-full px-2.5 py-1 uppercase transition ${
                  l === locale
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {l}
              </Link>
            ))}
          </div>

          {/* WhatsApp Button Desktop */}
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1ebd59]"
            >
              <span aria-hidden="true">💬</span>
              <span>WhatsApp</span>
            </a>
          ) : null}
        </div>

        {/* Mobile Actions: Language switcher + Hamburger toggle */}
        <div className="flex md:hidden items-center gap-2">
          {/* Quick Lang Switcher Mobile */}
          <div className="flex items-center rounded-full border border-line text-[11px] font-bold p-0.5">
            {SUPPORTED_LOCALES.map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                className={`rounded-full px-2 py-0.5 uppercase transition ${
                  l === locale
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {l}
              </Link>
            ))}
          </div>

          {/* Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Tutup menu" : "Buka menu navigasi"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-background text-foreground transition hover:bg-muted/10 active:scale-95"
          >
            {isOpen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Overlay Navigation */}
      {isOpen ? (
        <div
          className="fixed inset-x-0 top-[57px] bottom-0 z-50 flex flex-col bg-background/98 backdrop-blur-lg border-b border-line px-5 py-6 shadow-2xl md:hidden overflow-y-auto"
          style={{ height: "calc(100vh - 57px)" }}
        >
          <nav className="flex flex-col gap-2">
            <Link
              href={`/${locale}`}
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between rounded-xl p-3 text-base font-semibold transition ${
                pathname === `/${locale}`
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-foreground hover:bg-muted/10"
              }`}
            >
              <span>{navLabels.home}</span>
              <span className="text-muted text-sm">→</span>
            </Link>

            <Link
              href={`/${locale}/blog`}
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between rounded-xl p-3 text-base font-semibold transition ${
                pathname.startsWith(`/${locale}/blog`)
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-foreground hover:bg-muted/10"
              }`}
            >
              <span>{navLabels.blog}</span>
              <span className="text-muted text-sm">→</span>
            </Link>

            <Link
              href={`/${locale}/about`}
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between rounded-xl p-3 text-base font-semibold transition ${
                pathname.startsWith(`/${locale}/about`)
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-foreground hover:bg-muted/10"
              }`}
            >
              <span>{navLabels.about}</span>
              <span className="text-muted text-sm">→</span>
            </Link>

            <Link
              href={`/${locale}/contact`}
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between rounded-xl p-3 text-base font-semibold transition ${
                pathname.startsWith(`/${locale}/contact`)
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-foreground hover:bg-muted/10"
              }`}
            >
              <span>{navLabels.contact}</span>
              <span className="text-muted text-sm">→</span>
            </Link>
          </nav>

          {/* Mobile WhatsApp CTA */}
          {waHref ? (
            <div className="mt-8 border-t border-line pt-6">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1ebd59] active:scale-[0.98]"
              >
                <span className="text-lg">💬</span>
                <span>{whatsappBtnLabel}</span>
              </a>
            </div>
          ) : null}

          {/* Footer inside mobile menu */}
          <div className="mt-auto pt-6 text-center text-xs text-muted border-t border-line">
            <p className="font-medium text-foreground">{siteName}</p>
            <p className="mt-1">Pilihan bahasa: {locale.toUpperCase()}</p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
