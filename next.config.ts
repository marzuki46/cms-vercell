import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/en/:path*",
        headers: [
          { key: "Content-Language", value: "en" },
        ],
      },
      {
        source: "/en",
        headers: [
          { key: "Content-Language", value: "en" },
        ],
      },
      {
        source: "/id/:path*",
        headers: [
          { key: "Content-Language", value: "id-ID" },
        ],
      },
      {
        source: "/id",
        headers: [
          { key: "Content-Language", value: "id-ID" },
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
