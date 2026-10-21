import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isEn = pathname.startsWith("/en");
  const locale = isEn ? "en" : "id";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set HTTP response header Content-Language
  response.headers.set("Content-Language", isEn ? "en" : "id-ID");
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|rss.xml).*)",
  ],
};
