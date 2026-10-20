import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const ADMIN_PREFIXES = ["/admin", "/api/admin", "/api/settings", "/api/install"];

/**
 * Slugs are unique per site, so a slug change is a real URL change. The admin
 * UI has no slug editor today; this guard simply keeps future edits honest.
 */

/**
 * Proxy = auth guard for admin routes + legacy URL redirects.
 *
 * 1. Refreshes Supabase sessions for `/admin/*` and `/api/admin/*`.
 * 2. Sends legacy non-prefixed public URLs (e.g. /blog/x, /about) to their
 *    locale-prefixed equivalents with a permanent redirect, so historical links
 *    and indexed URLs keep their equity after the i18n migration.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isAdmin) {
    const legacy = legacyRedirect(pathname);
    if (legacy) {
      const url = request.nextUrl.clone();
      url.pathname = legacy;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname === "/admin/login";

  if (process.env.NODE_ENV !== "production" && !env.supabaseUrl) {
    return response;
  }

  if (!isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

const LEGACY_MAP: Array<[RegExp, string]> = [
  [/^\/blog\/([^/]+)$/, "/id/blog/$1"],
  [/^\/blog\/page\/(\d+)$/, "/id/blog/page/$1"],
  [/^\/blog$/, "/id/blog"],
  [/^\/about$/, "/id/about"],
  [/^\/contact$/, "/id/contact"],
];

function legacyRedirect(pathname: string): string | null {
  for (const [pattern, target] of LEGACY_MAP) {
    const match = pattern.exec(pathname);
    if (match) {
      return target.replace(/\$(\d)/g, (_, i) => match[Number(i)] ?? "");
    }
  }
  return null;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/settings/:path*",
    "/api/install/:path*",
    "/blog",
    "/blog/:path*",
    "/about",
    "/contact",
  ],
};
