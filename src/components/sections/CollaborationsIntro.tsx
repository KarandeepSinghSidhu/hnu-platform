import Image from "next/image";
import { COLLABORATIONS_INTRO_DEFAULTS } from "@/lib/blocks/collaborations-content";

interface CollaborationsIntroProps {
  sectionTitle?: string;
  sectionText?: string;
  pathwayTitle?: string;
  pathwaySteps?: string[];
  image?: string;
  imageAlt?: string;
  complianceTitle?: string;
  complianceText?: string;
}

export default function CollaborationsIntro({
  sectionTitle = COLLABORATIONS_INTRO_DEFAULTS.sectionTitle,
  sectionText = COLLABORATIONS_INTRO_DEFAULTS.sectionText,
  pathwayTitle = COLLABORATIONS_INTRO_DEFAULTS.pathwayTitle,
  pathwaySteps,
  image = COLLABORATIONS_INTRO_DEFAULTS.image,
  imageAlt = COLLABORATIONS_INTRO_DEFAULTS.imageAlt,
  complianceTitle = COLLABORATIONS_INTRO_DEFAULTS.complianceTitle,
  complianceText = COLLABORATIONS_INTRO_DEFAULTS.complianceText,
}: CollaborationsIntroProps) {
  const steps =
    pathwaySteps && pathwaySteps.length > 0
      ? pathwaySteps
      : [...COLLABORATIONS_INTRO_DEFAULTS.pathwaySteps];

  return (
    <section className="relative w-full bg-white overflow-hidden">

      {/* ── Mobile / tablet ── */}
      <div className="lg:hidden px-5 sm:px-8 py-10 flex flex-col gap-8">
        <div>
          <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "#0c0c48", marginBottom: "12px", lineHeight: 1.2 }}>
            {sectionTitle}
          </h2>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(13px, 2.5vw, 15px)", color: "#4b5563", lineHeight: 1.7, margin: 0 }}>
            {sectionText}
          </p>
        </div>

        {image && (
          <div style={{ borderRadius: "0 24px", overflow: "hidden", height: "clamp(200px, 45vw, 280px)", position: "relative" }}>
            <Image src={image} alt={imageAlt} fill sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
        )}

        <div style={{ backgroundColor: "#0a4379", borderRadius: "0 24px", padding: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(16px, 3vw, 18px)", fontWeight: 700, color: "white", marginBottom: "16px" }}>
            {pathwayTitle}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {steps.map((step, i) => (
              <div key={`${i}-${step}`} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, color: "white" }}>{i + 1}</span>
                </div>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.85)", margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "24px 0", padding: "20px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a4379" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "17px", fontWeight: 700, color: "#0a4379", margin: 0 }}>{complianceTitle}</h3>
          </div>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{complianceText}</p>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block py-16 px-8 xl:px-45">
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px, 5vw, 60px)", alignItems: "end" }}>

            {/* Left — text + pathway card */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(20px, 2.2vw, 25px)", fontWeight: 700, color: "#0c0c48", marginBottom: "16px", lineHeight: 1.2 }}>
                {sectionTitle}
              </h2>
              <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(14px, 1.2vw, 16px)", color: "#4b5563", lineHeight: 1.7, marginBottom: "32px" }}>
                {sectionText}
              </p>
              <div style={{ backgroundColor: "#0a4379", borderRadius: "0 30px", padding: "clamp(20px, 3vw, 32px)", flex: 1 }}>
                <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(16px, 1.5vw, 20px)", fontWeight: 700, color: "white", marginBottom: "20px" }}>
                  {pathwayTitle}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 1vw, 14px)" }}>
                  {steps.map((step, i) => (
                    <div key={`${i}-${step}`} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, color: "white" }}>{i + 1}</span>
                      </div>
                      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(13px, 1.1vw, 14px)", color: "rgba(255,255,255,0.85)", margin: 0 }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — image + compliance card, bottom-aligned */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ borderRadius: "0 30px", overflow: "hidden", height: "clamp(260px, 28vw, 396px)", position: "relative"}}>
                {image && <Image src={image} alt={imageAlt} fill sizes="(max-width: 1024px) 100vw, 35vw" style={{ objectFit: "cover" }} />}
              </div>
              <div style={{ backgroundColor: "#ffffff", borderRadius: "30px 0", padding: "clamp(16px, 2vw, 24px)", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a4379" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(16px, 1.5vw, 20px)", fontWeight: 700, color: "#0a4379", margin: 0 }}>{complianceTitle}</h3>
                </div>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(13px, 1.1vw, 14px)", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{complianceText}</p>
              </div>
            </div> 

          </div>
        </div>
      </div>
    </section>
  );
}