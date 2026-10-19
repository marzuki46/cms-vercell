import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/content";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "").slice(0, 120);
  const excerpt = (searchParams.get("excerpt") ?? "").slice(0, 200);
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
          padding: "72px",
          fontFamily: "sans-serif",
          border: "14px solid #2271b1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "#2271b1",
            }}
          />
          <span style={{ fontSize: "30px", fontWeight: 700, color: "#1d2327" }}>
            {site.site_name}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <span
            style={{
              fontSize: title ? 52 : 58,
              fontWeight: 800,
              color: "#1d2327",
              lineHeight: 1.16,
              maxWidth: "1000px",
            }}
          >
            {title || "Pusat Artikel & Wawasan Berkualitas Tinggi"}
          </span>
          {excerpt ? (
            <span style={{ fontSize: 25, color: "#646970", maxWidth: "900px" }}>
              {excerpt}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "2px solid #e4e7ec",
            paddingTop: "26px",
          }}
        >
          <span style={{ fontSize: 20, color: "#2271b1", fontWeight: 700 }}>
            Baca artikel lengkap
          </span>
          <span style={{ fontSize: 18, color: "#8c8f94" }}>
            {site.site_name}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
