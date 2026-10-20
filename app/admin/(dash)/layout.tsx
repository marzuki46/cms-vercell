import Link from "next/link";
import SignOutButton from "@/components/admin/signout-button";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV_MAIN = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/articles", label: "Pos (Articles)", icon: "📝" },
  { href: "/admin/articles/new", label: "Tulis Pos Baru", icon: "➕" },
  { href: "/admin/topics", label: "Ide & Topik AI", icon: "💡" },
];

const NAV_MANAGEMENT = [
  { href: "/admin/leads", label: "Lead WhatsApp", icon: "💬" },
  { href: "/admin/settings", label: "Pengaturan Situs", icon: "⚙️" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail = "Admin";
  try {
    const user = await getAdminUser();
    if (user?.email) userEmail = user.email;
  } catch (err) {
    console.error("AdminLayout getAdminUser failed:", (err as Error).message);
  }

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#2c3338] flex flex-col font-sans">
      {/* WordPress-style Top Admin Bar */}
      <header className="bg-[#1d2327] text-[#f0f0f1] text-xs h-10 px-4 flex items-center justify-between sticky top-0 z-50 border-b border-[#2c3338]">
        <div className="flex items-center gap-4">
          <Link
            href="/id"
            target="_blank"
            className="flex items-center gap-1.5 font-bold hover:text-[#72aee6] transition py-1"
            title="Lihat Situs Publik"
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Lihat Website</span>
          </Link>
          <span className="text-[#50575e]">|</span>
          <span className="font-semibold text-white tracking-wide">
            CMS SEO WP-Lite
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#a7aaad] hidden sm:inline">
            Halo, <strong className="text-white">{userEmail}</strong>
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* WordPress-style Sidebar */}
        <aside className="w-56 bg-[#1d2327] text-[#c3c4c7] flex-shrink-0 flex flex-col border-r border-[#2c3338] min-h-[calc(100vh-2.5rem)]">
          <div className="p-3 border-b border-[#2c3338]/60 bg-[#161a1d]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8f94]">
              Menu Utama
            </span>
          </div>

          <nav className="py-2 flex-1 flex flex-col gap-0.5 text-sm">
            {NAV_MAIN.map((item) => (
              <Link
                key={item.href}
                href={item.href}
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

            {NAV_MANAGEMENT.map((item) => (
              <Link
                key={item.href}
                href={item.href}
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
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
