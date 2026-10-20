import AdminShell from "@/components/admin/admin-shell";
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
  { href: "/admin/backup", label: "Backup & Restore", icon: "💾" },
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
    <AdminShell
      userEmail={userEmail}
      navMain={NAV_MAIN}
      navManagement={NAV_MANAGEMENT}
    >
      {children}
    </AdminShell>
  );
}
