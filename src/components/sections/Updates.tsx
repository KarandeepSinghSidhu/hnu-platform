"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Update {
  title: string;
  paragraphs: string[];
  date?: string;
}

interface UpdatesProps {
  updates: Update[];
  /** Any CSS background (colour or gradient). Defaults to the dark navy. */
  backgroundColor?: string;
  /** Accessible name for the carousel — this component renders both the
   *  "updates" and "announcements" blocks, so the caller sets the right label. */
  ariaLabelEn?: string;
  ariaLabelZh?: string;
}

/** Shared layout for each cell in the grid stack (hidden sizing cells + visible card). */
const cellStyle: React.CSSProperties = {
  gridArea: "1 / 1",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

/** One update's content — rendered both as a hidden sizing cell and as the visible card. */
function renderUpdate(update: Update) {
  return (
    <>
      {update.date && (
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {update.date}
        </span>
      )}

      <h3
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "clamp(18px, 4vw, 22px)",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.25,
          margin: 0,
        }}
      >
        {update.title}
      </h3>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {update.paragraphs.map((para, i) => (
          <p
            key={i}
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {para}
          </p>
        ))}
      </div>
    </>
  );
}

export default function Updates({
  updates,
  backgroundColor = "#0c0c48f2",
  ariaLabelEn = "Updates",
  ariaLabelZh = "动态",
}: UpdatesProps) {
  const { lang } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // True while keyboard focus is within the carousel: reveals the prev/next
  // arrows and pauses autoplay so a keyboard user can read and navigate without
  // the slide rotating under them.
  const [isFocused, setIsFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = (index: number, dir: "left" | "right") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 300);
  };

  const prev = () =>
    go(current === 0 ? updates.length - 1 : current - 1, "right");
  const next = () =>
    go(current === updates.length - 1 ? 0 : current + 1, "left");

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => next(), 5000);
    return () => clearInterval(timer);
  }, [updates.length, current, isHovered]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  // Defensive: the block renderer never passes an empty list, but don't
  // crash if it happens — and fall back to the first update if `current`
  // is briefly out of range after the list shrinks.
  const activeUpdate = updates[current] ?? updates[0];
  if (!activeUpdate) return null;

  return (
    <section className="w-full bg-white py-10 sm:py-16 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-12 flex justify-center sm:justify-end">
        <div
          className="w-full sm:max-w-[750px]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsFocused(false);
            }
          }}
        >
          {/* Card */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              // `background` (not `backgroundColor`) so gradients work too.
              // Text, arrows and dots stay white — light values reduce contrast.
              background: backgroundColor,
              borderRadius: "clamp(40px, 8vw, 80px) 0 clamp(40px, 8vw, 80px) 0",
              padding: "clamp(28px, 5vw, 50px) clamp(24px, 6vw, 80px)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              // The grid stack below already sizes the card to the tallest
              // update, so the card fits its content with no scrollbar. `maxHeight`
              // just caps an unusually long update; only then does overflowY:auto
              // show a scrollbar. (A fixed `height` showed a scrollbar even when
              // the content fit, because the content was a few px taller than the
              // padded box.)
              maxHeight: "380px",
              overflowY: "auto",
              position: "relative",
              overflowX: "hidden",
              touchAction: "pan-y",
              userSelect: "none",
            }}
          >
            {/* Prev button — desktop only */}
            <button
              onClick={prev}
              aria-label={lang === "EN" ? "Previous update" : "上一条"}
              className="updates-arrow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{
                position: "absolute",
                left: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.9)",
                fontSize: "32px",
                fontWeight: 300,
                cursor: "pointer",
                lineHeight: 1,
                opacity: isHovered ? 1 : 0,
                transition: "opacity 0.2s ease",
                zIndex: 2,
                display: "var(--arrow-display, block)" as React.CSSProperties["display"],
              }}
            >
              ←
            </button>

            {/* Next button — desktop only */}
            <button
              onClick={next}
              aria-label={lang === "EN" ? "Next update" : "下一条"}
              className="updates-arrow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.9)",
                fontSize: "32px",
                fontWeight: 300,
                cursor: "pointer",
                lineHeight: 1,
                opacity: isHovered ? 1 : 0,
                transition: "opacity 0.2s ease",
                zIndex: 2,
              }}
            >
              →
            </button>

            {/* Animated content as a grid stack: every update stays mounted
                as a hidden cell in the same grid area, so the card always
                holds the height of the tallest update and the page never
                reflows (jumps) when the carousel rotates. The active update
                is a visible overlay keyed on `current`, remounted per change
                so the slide-in animation restarts. */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)" }}>
              {updates.map((u, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  style={{ ...cellStyle, visibility: "hidden" }}
                >
                  {renderUpdate(u)}
                </div>
              ))}

              <div
                key={`active-${current}`}
                style={{
                  ...cellStyle,
                  animation: `${direction === "left" ? "slideInLeft" : "slideInRight"} 0.3s ease`,
                }}
              >
                {renderUpdate(activeUpdate)}
              </div>
            </div>
          </div>

          {/* Dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "20px",
            }}
          >
            {updates.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > current ? "left" : "right")}
                aria-label={`Go to update ${i + 1}`}
                style={{
                  width: i === current ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  backgroundColor: i === current ? "#0c0c48" : "#9ca3af",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 640px) {
          /* Hide the arrows on small screens via a stable class (not the now
             localized aria-label); dots + swipe handle touch navigation. */
          .updates-arrow {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}