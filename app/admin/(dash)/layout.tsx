import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/admin/signout-button";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/topics", label: "Topik" },
  { href: "/admin/articles", label: "Artikel" },
  { href: "/admin/leads", label: "Lead WA" },
  { href: "/admin/settings", label: "Pengaturan" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login?next=/admin");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-semibold tracking-tight">
            Admin
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-muted">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
