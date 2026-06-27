"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const canUseDOM = typeof document !== "undefined";

/**
 * A small circled-"i" help affordance. Hovering OR keyboard-focusing the icon
 * reveals a short plain-language explanation. The bubble is rendered in a portal
 * with `position: fixed` so the admin shell's `overflow` containers can never
 * clip it (mirrors PopoverMenu's anti-clipping approach), and it's wired with
 * `role="tooltip"` + `aria-describedby` so screen readers announce it.
 */
export default function InfoTooltip({
  label,
  children,
  width = 300,
}: {
  /** Accessible name for the trigger, e.g. "What automatic sorting does". */
  label: string;
  /** The explanation shown in the bubble. */
  children: ReactNode;
  /** Preferred bubble width in px (clamped to the viewport). */
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleId = useId();
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });

  const reposition = useCallback(() => {
    const anchor = triggerRef.current;
    if (!anchor) return;
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const gap = 6;
    const w = Math.min(width, vw - margin * 2);

    // Centre under the icon, then clamp inside the viewport.
    let left = a.left + a.width / 2 - w / 2;
    left = Math.max(margin, Math.min(left, vw - w - margin));

    // Prefer below the icon; flip above when there isn't room.
    const spaceBelow = vh - a.bottom - gap - margin;
    const openUp = spaceBelow < 96 && a.top > vh - a.bottom;

    setStyle({
      position: "fixed",
      left: Math.round(left),
      width: w,
      visibility: "visible",
      ...(openUp
        ? { bottom: Math.round(vh - a.top + gap) }
        : { top: Math.round(a.bottom + gap) }),
    });
  }, [width]);

  // Position on open, and keep anchored while scrolling/resizing.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  // Escape closes (keyboard users).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? bubbleId : undefined}
        // The trigger is hover/focus-driven; swallow clicks so the component is
        // safe to place next to (or inside) other clickable elements.
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#0a4479]/40 text-[#0a4479] hover:bg-[#0a4479] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4479]/40 transition-colors"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 7.25v3.25"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5" r="0.95" fill="currentColor" />
        </svg>
      </button>

      {open &&
        canUseDOM &&
        createPortal(
          <div
            id={bubbleId}
            role="tooltip"
            style={style}
            className="z-50 rounded-xl border border-[#0a4479]/15 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-[#0c0c48] shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}
