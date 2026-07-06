import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vertex International Recruitment Ltd.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#03120d",
          backgroundImage:
            "radial-gradient(circle at 78% 22%, rgba(212,175,92,0.20) 0%, rgba(212,175,92,0) 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 56 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: "#062119",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="52" height="52" viewBox="80 15 170 170">
              <path d="M 120 85 C 130 83 145 75 160 55 C 135 65 110 75 80 85 Z" fill="#D4AF5C" />
              <path
                d="M 125 100 L 165 150 L 250 50 C 220 55 195 70 170 115 L 140 85 Z"
                fill="#D4AF5C"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 34,
                fontWeight: 700,
                color: "#fbf9f4",
                letterSpacing: 6,
                lineHeight: 1,
              }}
            >
              VERTEX
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#d4af5c",
                letterSpacing: 7,
                marginTop: 6,
              }}
            >
              INTERNATIONAL
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 58,
            fontWeight: 700,
            color: "#fbf9f4",
            lineHeight: 1.15,
            maxWidth: 980,
            letterSpacing: -1,
          }}
        >
          <span>Your&nbsp;gateway&nbsp;to&nbsp;</span>
          <span style={{ color: "#d4af5c" }}>global&nbsp;careers.</span>
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: "rgba(251,249,244,0.55)",
            marginTop: 28,
            maxWidth: 820,
          }}
        >
          UK-incorporated human capital & mobility enterprise
        </div>
      </div>
    ),
    { ...size }
  );
}
