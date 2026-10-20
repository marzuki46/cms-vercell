import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/content";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "").slice(0, 110);
  const topic = (searchParams.get("topic") ?? "").slice(0, 40);
  const siteParam = searchParams.get("site");

  let siteName = siteParam || "";
  if (!siteName) {
    try {
      const site = await getSiteSettings();
      siteName = site.site_name;
    } catch {
      siteName = "Portal Publikasi";
    }
  }

  const cleanTopic = topic.replace(/[-_]/g, " ").toUpperCase() || "ARTIKEL PILIHAN";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          padding: "60px 72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle decorative glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34, 113, 177, 0.4) 0%, rgba(34, 113, 177, 0) 70%)",
          }}
        />

        {/* Top Header: Topic Badge + Site Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(34, 113, 177, 0.25)",
              border: "1px solid rgba(114, 174, 230, 0.4)",
              borderRadius: "9999px",
              padding: "8px 18px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#72aee6",
              }}
            />
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#90c3f5",
                letterSpacing: "1.5px",
              }}
            >
              {cleanTopic}
            </span>
          </div>

          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#94a3b8",
            }}
          >
            {siteName}
          </span>
        </div>

        {/* Center: Large Post Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "1050px",
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: title.length > 70 ? "46px" : title.length > 45 ? "54px" : "62px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.18,
              letterSpacing: "-0.5px",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {title || "Informasi & Panduan Lengkap"}
          </span>

          <div
            style={{
              width: "100px",
              height: "4px",
              backgroundColor: "#2271b1",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Bottom Bar: Call to read & verification badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
            paddingTop: "24px",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📖</span>
            <span style={{ fontSize: "17px", color: "#cbd5e1", fontWeight: 600 }}>
              Baca ulasan dan panduan selengkapnya
            </span>
          </div>

          <span
            style={{
              fontSize: "15px",
              color: "#64748b",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            VERIFIED CONTENT · 100% EXCLUSIVE
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  );
}
