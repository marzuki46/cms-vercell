"use client";

import Link from "next/link";
import { useState } from "react";
import SignOutButton from "@/components/admin/signout-button";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  userEmail: string;
  navMain: NavItem[];
  navManagement: NavItem[];
  children: React.ReactNode;
}

export default function AdminShell({
  userEmail,
  navMain,
  navManagement,
  children,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#2c3338] flex flex-col font-sans">
      {/* WordPress-style Top Admin Bar */}
      <header className="bg-[#1d2327] text-[#f0f0f1] text-xs h-12 sm:h-10 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-50 border-b border-[#2c3338]">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Buka Menu Admin"
            className="md:hidden p-1.5 rounded text-[#c3c4c7] hover:text-white hover:bg-[#2c3338] transition"
          >
            {mobileMenuOpen ? (
              <span className="text-lg leading-none font-bold">✕</span>
            ) : (
              <span className="text-lg leading-none">☰</span>
            )}
          </button>

          <Link
            href="/id"
            target="_blank"
            className="flex items-center gap-1.5 font-bold hover:text-[#72aee6] transition py-1 text-xs"
            title="Lihat Situs Publik"
          >
            <span>🏠</span>
            <span className="hidden xs:inline sm:inline">Lihat Website</span>
          </Link>
          <span className="text-[#50575e] hidden sm:inline">|</span>
          <span className="font-semibold text-white tracking-wide truncate max-w-[140px] sm:max-w-none text-xs">
            CMS WP-Lite
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[#a7aaad] hidden md:inline truncate max-w-[180px]">
            Halo, <strong className="text-white">{userEmail}</strong>
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen ? (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
            aria-hidden="true"
          />
        ) : null}

        {/* WordPress-style Sidebar (Desktop persistent, Mobile off-canvas drawer) */}
        <aside
          className={`
            fixed md:static top-12 md:top-auto bottom-0 left-0 z-40
            w-64 sm:w-56 bg-[#1d2327] text-[#c3c4c7] flex-shrink-0 flex flex-col border-r border-[#2c3338]
            transition-transform duration-200 ease-in-out md:translate-x-0
            ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-2.5rem)]
          `}
        >
          <div className="p-3 border-b border-[#2c3338]/60 bg-[#161a1d] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8f94]">
              Menu Utama
            </span>
            <span className="text-[11px] text-[#a7aaad] md:hidden truncate max-w-[130px]">
              {userEmail}
            </span>
          </div>

          <nav className="py-2 flex-1 flex flex-col gap-0.5 text-sm overflow-y-auto">
            {navMain.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#2271b1] hover:text-white transition group"
              >
                <span className="text-base group-hover:scale-110 transition">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="mt-4 px-3.5 pt-3 pb-1 border-t border-[#2c3338]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8f94]">
                Manajemen
              </span>
            </div>

            {navManagement.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#2271b1] hover:text-white transition group"
              >
                <span className="text-base group-hover:scale-110 transition">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-3 bg-[#161a1d] border-t border-[#2c3338] text-[11px] text-[#8c8f94]">
            Versi WP-Lite · Auto SEO
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
