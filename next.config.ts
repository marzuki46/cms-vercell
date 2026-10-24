import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/en/:path*",
        headers: [
          { key: "Content-Language", value: "en" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/en",
        headers: [
          { key: "Content-Language", value: "en" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/id/:path*",
        headers: [
          { key: "Content-Language", value: "id-ID" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/id",
        headers: [
          { key: "Content-Language", value: "id-ID" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
