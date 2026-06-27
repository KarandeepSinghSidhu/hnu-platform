"use client";

import Button from "@/components/ui/Button";
import { useLanguage } from "@/contexts/LanguageContext";
import { NewTabHint } from "@/components/ui/NewTabHint";
import { publicationHref } from "@/lib/safe-url";

type Publication = {
  id: number;
  title: string;
  authorsRaw: string;
  journal: string | null;
  year: number | null;
  pubType: string;
  url: string | null;
  doi: string | null;
};

// Publications are read on the server (getRecentPublications: narrow select +
// take) and passed in as props, so the homepage no longer downloads the whole
// publications table just to render these cards. This stays a client component
// only for the translated labels.
export default function RecentPublications({
  publications = [],
}: {
  publications?: Publication[];
}) {
  const { t } = useLanguage();

  return (
    <section className="relative w-full bg-[#f0f0f0] py-16 px-6 sm:px-12 lg:px-45">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex justify-center items-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0c0c48] pb-15 text-center">
            {t.research.recentPublicationsTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1400px] mx-auto">
          {publications.map((pub) => {
            const href = publicationHref(pub);
            return (
            <div
              key={pub.id}
              style={{
                backgroundColor: "white",
                borderRadius: "20px",
                padding: "36px 40px",
                boxShadow: "0 0 20px rgba(0,0,0,0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(10,67,121,0.1)",
                  color: "#0a4379",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "4px 12px",
                  borderRadius: "9999px",
                }}
              >
                {pub.pubType}
              </span>

              <h3
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#0c0c48",
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {pub.title}
              </h3>

              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  color: "#0a4379",
                  margin: 0,
                }}
              >
                {pub.authorsRaw}
              </p>

              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  fontStyle: "italic",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                {[pub.journal, pub.year].filter(Boolean).join(" · ")}
              </p>

              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "8px",
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "14px",
                    color: "#0a4379",
                    textDecoration: "underline",
                  }}
                >
                  {t.research.viewPublicationArrow}
                  <NewTabHint />
                </a>
              )}
            </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-10">
          <Button href="/research" color="dark">
            {t.research.viewAllPublications}
          </Button>
        </div>
      </div>
    </section>
  );
}
