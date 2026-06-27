"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type Align = "start" | "center" | "end";

// Only one popover should be open at a time. We track the active one at module
// scope so opening a second menu auto-closes the first (otherwise each
// AddBlockButton / overflow menu keeps its own state and they stack).
let activePopover: { id: symbol; close: () => void } | null = null;

/**
 * A menu/panel anchored to a trigger element, rendered in a portal on
 * `document.body` with `position: fixed`. Because it lives outside the admin
 * shell's `overflow` container it can never be clipped by an ancestor; it also
 * clamps within the viewport horizontally and flips above the trigger when
 * there isn't room below. Used by the add-block picker and the block-card
 * overflow menu so the anti-clipping logic lives in one place.
 */
export default function PopoverMenu({
  anchorRef,
  open,
  onClose,
  align = "center",
  width = 288,
  gap = 4,
  className = "",
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Horizontal alignment of the panel relative to the trigger. */
  align?: Align;
  /** Preferred panel width in px (clamped to the viewport). */
  width?: number;
  /** Gap in px between the trigger and the panel. */
  gap?: number;
  className?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<symbol>(Symbol("popover"));
  // Keep the latest onClose without re-subscribing the single-open effect.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });

  useEffect(() => setMounted(true), []);

  // Single-open behaviour: closing the previously-open popover when this opens.
  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    if (activePopover && activePopover.id !== id) activePopover.close();
    activePopover = { id, close: () => onCloseRef.current() };
    return () => {
      if (activePopover?.id === id) activePopover = null;
    };
  }, [open]);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const w = Math.min(width, vw - margin * 2);

    // Horizontal placement, then clamp inside the viewport.
    let left =
      align === "center"
        ? a.left + a.width / 2 - w / 2
        : align === "end"
          ? a.right - w
          : a.left;
    left = Math.max(margin, Math.min(left, vw - w - margin));

    // Prefer opening downward; flip up when cramped below and roomier above.
    const spaceBelow = vh - a.bottom - gap - margin;
    const spaceAbove = a.top - gap - margin;
    const natural = panel ? panel.scrollHeight : 0;
    const openUp =
      spaceBelow < Math.min(natural || 260, 260) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.floor(openUp ? spaceAbove : spaceBelow));

    setStyle({
      position: "fixed",
      left: Math.round(left),
      width: w,
      maxHeight,
      visibility: "visible",
      ...(openUp
        ? { bottom: Math.round(vh - a.top + gap) }
        : { top: Math.round(a.bottom + gap) }),
    });
  }, [anchorRef, align, width, gap]);

  // Position on open, and keep anchored while scrolling/resizing.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = (e: Event) => {
      // Scrolling inside the panel shouldn't move it.
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) {
        return;
      }
      reposition();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus into the popover on open and restore it to the trigger on close,
  // so keyboard users land in — and return cleanly from — the menu. This is a
  // plain popover (items are ordinary buttons), so Tab/Enter/Escape work without
  // claiming the full ARIA menu keyboard pattern (roving arrow-key navigation).
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      {/*
        Click-away backdrop. Transparent and non-focusable (tabIndex={-1} +
        aria-hidden) so it stays out of the tab order and is ignored by screen
        readers; keyboard users close via Escape (handled above).
      */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        style={style}
        className={`z-50 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-2 shadow-xl ${className}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
