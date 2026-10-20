import type { Metadata } from "next";
import BackupAdmin from "@/components/admin/backup-admin";

export const metadata: Metadata = {
  title: "Backup & Restore · CMS WP-Lite",
};

export default function BackupPage() {
  return <BackupAdmin />;
}
