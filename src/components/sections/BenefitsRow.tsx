"use client";

import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Dictionary } from "@/lib/dictionaries";

type Benefit = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const getAcademicBenefits = (t: Dictionary): Benefit[] => [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: t.collaborations.knowledgeExchangeTitle,
    description: t.collaborations.knowledgeExchangeDescription,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    title: t.collaborations.studentTrainingTitle,
    description: t.collaborations.studentTrainingDescription,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: t.collaborations.jointPublicationsTitle,
    description: t.collaborations.jointPublicationsDescription,
  },
];

const getIndustryBenefits = (t: Dictionary): Benefit[] => [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: t.collaborations.independentExpertiseTitle,
    description: t.collaborations.independentExpertiseDescription,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: t.collaborations.regulatoryComplianceTitle,
    description: t.collaborations.regulatoryComplianceDescription,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: t.collaborations.commercialValueTitle,
    description: t.collaborations.commercialValueDescription,
  },
];

interface BenefitsRowProps {
  variant: "academic" | "industry" | "both";
  title?: string;
}

function BenefitGrid({ benefits }: { benefits: Benefit[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
      {benefits.map((benefit) => (
        <div key={benefit.title} style={{ textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#0a4379", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            {benefit.icon}
          </div>
          <h3 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "18px", fontWeight: 700, color: "#0c0c48", marginBottom: "8px" }}>
            {benefit.title}
          </h3>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
            {benefit.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function BenefitAccordion({ benefits }: { benefits: Benefit[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {benefits.map((benefit, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={benefit.title} style={{ backgroundColor: "white", borderRadius: "16px", overflow: "hidden" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "16px", fontWeight: 700, color: "#0c0c48" }}>
                {benefit.title}
              </span>
              <span style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#0c0c48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "192px", height: "192px", borderRadius: "50%", backgroundColor: "#0c0c48", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ transform: "scale(3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {benefit.icon}
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#4b5563", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
                  {benefit.description}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BenefitsRow({ variant, title }: BenefitsRowProps) {
  const { t } = useLanguage();

  const academicBenefits = getAcademicBenefits(t);
  const industryBenefits = getIndustryBenefits(t);

  return (
    <section style={{ backgroundColor: "#f0f0f0", padding: "60px 0" }}>
      {/* Desktop */}
      <div className="hidden lg:block" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 45px" }}>
        {title && (
          <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "36px", fontWeight: 800, color: "#0c0c48", textAlign: "center", marginBottom: "40px" }}>
            {title}
          </h2>
        )}
        {variant === "academic" && <BenefitGrid benefits={academicBenefits} />}
        {variant === "industry" && <BenefitGrid benefits={industryBenefits} />}
        {variant === "both" && (
          <>
            <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "28px", fontWeight: 700, color: "#0c0c48", textAlign: "center", marginBottom: "32px" }}>
              {t.collaborations.academicBenefitsTitle}
            </h2>
            <BenefitGrid benefits={academicBenefits} />
            <div style={{ height: "48px" }} />
            <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "28px", fontWeight: 700, color: "#0c0c48", textAlign: "center", marginBottom: "32px" }}>
              {t.collaborations.industryBenefitsTitle}
            </h2>
            <BenefitGrid benefits={industryBenefits} />
          </>
        )}
      </div>

      {/* Mobile */}
      <div className="lg:hidden px-6">
        {title && (
          <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "26px", fontWeight: 800, color: "#0c0c48", textAlign: "center", marginBottom: "24px" }}>
            {title}
          </h2>
        )}
        {variant === "academic" && <BenefitAccordion benefits={academicBenefits} />}
        {variant === "industry" && <BenefitAccordion benefits={industryBenefits} />}
        {variant === "both" && (
          <>
            <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0c0c48", textAlign: "center", marginBottom: "20px" }}>
              {t.collaborations.academicBenefitsTitle}
            </h2>
            <BenefitAccordion benefits={academicBenefits} />
            <div style={{ height: "36px" }} />
            <h2 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0c0c48", textAlign: "center", marginBottom: "20px" }}>
              {t.collaborations.industryBenefitsTitle}
            </h2>
            <BenefitAccordion benefits={industryBenefits} />
          </>
        )}
      </div>
    </section>
  );
}