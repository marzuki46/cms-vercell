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

  // Google Search Console HTML File verification handler
  // Matches e.g. /google1234567890abcdef.html
  const googleMatch = pathname.match(/^\/(google[a-zA-Z0-9_-]+\.html)$/i);
  if (googleMatch) {
    const filename = googleMatch[1];
    return new NextResponse(`google-site-verification: ${filename}`, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Bing Webmaster verification XML file
  if (pathname.toLowerCase() === "/bingsiteauth.xml") {
    return new NextResponse(
      `<?xml version="1.0"?><users><user>verified</user></users>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      },
    );
  }

  // IndexNow verification text file handler (e.g. /e7c8d9a1f2b34c5d6e7f8a9b0c1d2e3f.txt)
  const indexNowMatch = pathname.match(/^\/([a-f0-9]{16,64})\.txt$/i);
  if (indexNowMatch) {
    const key = indexNowMatch[1];
    return new NextResponse(`${key}\n`, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const isAdmin = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isAdmin) {
    // 1. Check custom redirects from database (only for non-localized paths)
    const isLocalized = pathname.startsWith("/id") || pathname.startsWith("/en");
    if (!isLocalized && env.supabaseUrl && env.supabaseAnonKey) {
      try {
        const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: () => {},
          },
        });
        const { data: redirectEntry } = await supabase
          .from("redirects")
          .select("to_path,status_code")
          .eq("from_path", pathname)
          .maybeSingle();

        if (redirectEntry?.to_path) {
          const dest = redirectEntry.to_path;
          const status = redirectEntry.status_code === 302 ? 307 : 308;
          if (dest.startsWith("http://") || dest.startsWith("https://")) {
            return NextResponse.redirect(new URL(dest), status);
          }
          const targetUrl = request.nextUrl.clone();
          targetUrl.pathname = dest;
          return NextResponse.redirect(targetUrl, status);
        }
      } catch {
        // Fallback gracefully on DB failure
      }
    }

    const legacy = legacyRedirect(pathname);
    if (legacy) {
      const url = request.nextUrl.clone();
      url.pathname = legacy;
      return NextResponse.redirect(url, 308);
    }

    const isEn = pathname.startsWith("/en");
    const res = NextResponse.next();
    res.headers.set("Content-Language", isEn ? "en" : "id-ID");
    return res;
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

  const isApi = pathname.startsWith("/api/");

  if (!isLogin && !user) {
    if (isApi) {
      return NextResponse.json(
        { error: "Unauthorized: Sesi login admin tidak valid." },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Enforce ADMIN_EMAILS allowlist check right at the proxy level
  if (user && env.adminEmails.length > 0 && !env.adminEmails.includes(user.email?.toLowerCase().trim() ?? "")) {
    if (isApi) {
      return NextResponse.json(
        { error: "Forbidden: Akun ini tidak memiliki akses administrator." },
        { status: 403 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("error", "forbidden");
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
    "/en",
    "/en/:path*",
    "/id",
    "/id/:path*",
    "/blog",
    "/blog/:path*",
    "/about",
    "/contact",
    "/google:file*.html",
    "/BingSiteAuth.xml",
  ],
};
