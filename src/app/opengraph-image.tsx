import { ImageResponse } from "next/og";
import { SITE_NAME, BRAND_COLORS } from "@/lib/constants";

// Branded default share image for the whole site (also used as the Twitter
// summary_large_image). Rendered by next/og (Satori), which is independent of
// the `images: { unoptimized: true }` setting in next.config.ts.

export const alt = `${SITE_NAME} — University of Auckland Research`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: BRAND_COLORS.uoaWaitemata,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -1 }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 34, marginTop: 20, opacity: 0.85 }}>
          University of Auckland Research
        </div>
        <div
          style={{
            marginTop: 48,
            height: 8,
            width: 220,
            background: BRAND_COLORS.uoaMahina,
            borderRadius: 4,
          }}
        />
      </div>
    ),
    size,
  );
}
