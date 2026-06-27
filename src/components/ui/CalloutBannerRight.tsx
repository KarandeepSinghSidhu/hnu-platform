// src/components/ui/CalloutBanner.tsx
import Link from "next/link";
import Button from "../ui/Button";
import RichText from "@/components/blocks/RichText";

interface CalloutBannerRightProps {
  tag?: string;
  title: string;
  description: string;
  buttonLabel?: string;
  buttonHref?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  leftTitle?: string;
  leftDescription?: string;
  showButton?: boolean;
}

export default function CalloutBannerRight({
  title,
  description,
  buttonLabel = "Find out more",
  buttonHref = "#",
  backgroundImage,
  backgroundColor = "linear-gradient(112deg, #092d65 0%, #06699b 50%, #02a8d0 100%)",
  leftTitle,
  leftDescription,
  showButton = false,
}: CalloutBannerRightProps) {
  return (
    <section
      className="@container relative w-full overflow-hidden"
      style={{ background: backgroundColor }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1, zIndex: 5 }}
        />
      )}

      {/* ── Mobile: stacked ── */}
      <div className="lg:hidden relative z-10 flex flex-col gap-6 px-5 py-10">
        {(leftTitle || leftDescription) && (
          <div>
            {leftTitle && (
              <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(24px, 6vw, 32px)", fontWeight: 800, color: "white", marginBottom: "10px", lineHeight: 1.2 }}>
                {leftTitle}
              </h2>
            )}
            {leftDescription && (
              <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(14px, 3vw, 16px)", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                {leftDescription}
              </p>
            )}
          </div>
        )}
        <div style={{ backgroundColor: "white", borderRadius: "0 40px", padding: "28px 24px", boxShadow: "0 0px 20px 20px rgba(0,0,0,0.15)" }}>
          <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 800, color: "#0c0c48", marginBottom: "10px", lineHeight: 1.2 }}>
            {title}
          </h2>
          <RichText
            html={description}
            className="[&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:text-[#0c0c48] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(13px, 3vw, 15px)", color: "#4b5563", lineHeight: 1.6, marginBottom: "20px" }}
          />
          {showButton && <Button href={buttonHref} variant="blue">{buttonLabel}</Button>}
        </div>
      </div>

      {/* ── Desktop/tablet: side by side, everything scales with clamp ── */}
      <div
        className="hidden lg:flex relative z-10 py-16 px-12 xl:px-45"
        style={{ alignItems: "center", justifyContent: "space-between", gap: "clamp(24px, 4vw, 40px)" }}
      >
        <div
          className="max-w-[1100px] mx-auto w-full"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "clamp(24px, 4vw, 40px)" }}
        >
          {/* Left text */}
          {(leftTitle || leftDescription) && (
            <div style={{ flex: 1, minWidth: 0 }}>
              {leftTitle && (
                <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 800, color: "white", marginBottom: "clamp(10px, 1.5vw, 16px)", lineHeight: 1.2 }}>
                  {leftTitle}
                </h2>
              )}
              {leftDescription && (
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(14px, 1.4vw, 18px)", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                  {leftDescription}
                </p>
              )}
            </div>
          )}

          {/* White card */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0 80px",
              padding: "clamp(28px, 4vw, 50px) clamp(28px, 5vw, 80px) clamp(28px, 4vw, 50px) clamp(28px, 4vw, 50px)",
              width: "clamp(280px, 42vw, 550px)",
              flexShrink: 0,
              boxShadow: "0 0px 20px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 800, color: "#0c0c48", marginBottom: "clamp(10px, 1.5vw, 16px)", lineHeight: 1.2 }}>
              {title}
            </h2>
            <RichText
              html={description}
              className="[&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:text-[#0c0c48] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(13px, 1.2vw, 16px)", color: "#4b5563", lineHeight: 1.6, marginBottom: "clamp(16px, 2vw, 28px)" }}
            />
            {showButton && <Button href={buttonHref} variant="blue">{buttonLabel}</Button>}
          </div>
        </div>
      </div>
    </section>
  );
}