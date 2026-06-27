"use client";

import { useRef, useState, useEffect } from "react";
import DirectorCard from "@/components/team/DirectorCard";
import type { TeamMemberRecord } from "@/lib/data/team";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BoardOfDirectors({
  members,
}: {
  members: TeamMemberRecord[];
}) {
  const { t } = useLanguage();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.scrollWidth / members.length;
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveIndex(index);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [members.length]);

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / members.length;
    el.scrollTo({ left: cardWidth * index, behavior: "smooth" });
  };

  return (
    <section style={{ backgroundColor: "white", padding: "60px 0" }}>
      <h2
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          color: "#0c0c48",
          textAlign: "center",
          marginBottom: "48px",
          padding: "0 24px",
        }}
      >
        {t.team.boardOfDirectors}
      </h2>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto px-6 pb-4 snap-x snap-mandatory"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            scrollPaddingLeft: "24px",
            padding: "20px 48px",
            
          }}
        >
          {members.map((director) => (
            <div
              key={director.id}
              className="flex-shrink-0 snap-start"
              style={{ width: "72vw", maxWidth: "280px" }}
            >
              <DirectorCard
                name={director.name}
                title={director.title}
                photoPath={director.photoPath}
                profileUrl={director.profileUrl}
              />
            </div>
          ))}
          <div className="flex-shrink-0 w-2" />
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {members.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to director ${i + 1}`}
              style={{
                width: i === activeIndex ? "24px" : "8px",
                height: "8px",
                borderRadius: "9999px",
                backgroundColor: i === activeIndex ? "#0c0c48" : "#d1d5db",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Desktop: original wrapped flex layout */}
      <div
        className="hidden md:flex"
        style={{
          gap: "24px",
          maxWidth: "1200px",
          margin: "0 auto",
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "0 48px",
        }}
      >
        {members.map((director) => (
          <DirectorCard
            key={director.id}
            name={director.name}
            title={director.title}
            photoPath={director.photoPath}
            profileUrl={director.profileUrl}
          />
        ))}
      </div>
    </section>
  );
}