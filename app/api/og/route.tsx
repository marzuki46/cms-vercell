import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/content";

export const runtime = "edge";

export async function GET() {
  const site = await getSiteSettings();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: "80px",
          fontFamily: "sans-serif",
          border: "16px solid #2271b1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#2271b1",
            }}
          />
          <span
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#1d2327",
              letterSpacing: "-0.5px",
            }}
          >
            {site.site_name}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span
            style={{
              fontSize: "60px",
              fontWeight: 900,
              color: "#1d2327",
              lineHeight: 1.15,
              maxWidth: "950px",
            }}
          >
            Pusat Artikel & Wawasan Berkualitas Tinggi
          </span>
          <span
            style={{
              fontSize: "26px",
              color: "#646970",
              maxWidth: "850px",
            }}
          >
            Disusun berbasis riset mendalam dan dioptimalkan secara komprehensif untuk mesin pencari.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "2px solid #e4e7ec",
            paddingTop: "32px",
          }}
        >
          <span style={{ fontSize: "20px", color: "#2271b1", fontWeight: 700 }}>
            {site.site_name} · Blog Resmi
          </span>
          <span style={{ fontSize: "18px", color: "#8c8f94" }}>
            Baca artikel terbaru →
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
