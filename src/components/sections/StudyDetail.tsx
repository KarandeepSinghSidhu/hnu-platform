"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudyDetailProps {
  status: "Open" | "Closed" | "Coming Soon";
  deadline?: string;
  eligibility: string[];
  contactHref?: string;
  joinHref?: string;
  content: React.ReactNode;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  Open: { bg: "#e6f4ea", color: "#1a7f37" },
  Closed: { bg: "#fce8e8", color: "#c0392b" },
  "Coming Soon": { bg: "#fff8e1", color: "#b07d00" },
};

export default function StudyDetail({
  status,
  deadline,
  eligibility,
  contactHref = "/contact",
  joinHref = "/contact",
  content,
}: StudyDetailProps) {
  const { t } = useLanguage();
  const statusStyle = statusColors[status];
  const statusLabel =
    status === "Open"
      ? t.studies.statusOpen
      : status === "Closed"
        ? t.studies.statusClosed
        : t.studies.statusComingSoon;

  return (
    <section className="relative w-full bg-white py-16 px-6 sm:px-12 lg:px-45 overflow-hidden">
      {/* Top pills */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "1.5px solid #0c0c48",
            borderRadius: "9999px",
            padding: "6px 16px",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            color: "#0c0c48",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: statusStyle.color,
              display: "inline-block",
            }}
          />
          {statusLabel}
        </div>

        {deadline && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "1.5px solid #0c0c48",
              borderRadius: "9999px",
              padding: "6px 16px",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "14px",
              color: "#0c0c48",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0c0c48"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {deadline}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
        {/* Left — study info */}
        <div
          style={{
            flex: 1,
            backgroundColor: "white",
            borderRadius: "20px",
            boxShadow: "0 0 20px rgba(0,0,0,0.08)",
            padding: "40px",
            minHeight: "600px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "16px",
              lineHeight: 1.8,
              color: "#1f2937",
            }}
          >
            {content}
          </div>
        </div>

        {/* Right — eligibility + join */}
        <div
          style={{
            width: "320px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Eligibility */}
          <div
            style={{
              border: "2px solid #0c0c48",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "18px",
                fontWeight: 700,
                color: "#0c0c48",
                marginBottom: "16px",
              }}
            >
              {t.studies.eligibility}
            </h2>
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingLeft: "0",
                listStyle: "none",
                margin: 0,
              }}
            >
              {eligibility.map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "14px",
                    color: "#374151",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#0c0c48",
                      flexShrink: 0,
                      marginTop: "6px",
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Join now */}
          <Link
            href={joinHref}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #0c0c48",
              borderRadius: "16px",
              padding: "24px",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "22px",
              fontWeight: 600,
              color: "#0c0c48",
              textDecoration: "none",
              transition: "all 0.2s ease",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "#0c0c48";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "white";
              (e.currentTarget as HTMLElement).style.color = "#0c0c48";
            }}
          >
            {t.studies.joinNow}
          </Link>

          {/* Contact link */}
          <Link
            href={contactHref}
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "14px",
              color: "#0c0c48",
              textAlign: "center",
              textDecoration: "underline",
            }}
          >
            {t.studies.haveQuestions}
          </Link>
        </div>
      </div>
    </section>
  );
}
