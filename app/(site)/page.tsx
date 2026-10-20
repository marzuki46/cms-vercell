import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/** Root URL redirects permanently to the default locale. */
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
