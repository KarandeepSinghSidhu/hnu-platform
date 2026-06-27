"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus within `containerRef` while `active`, closes on Escape, and
 * restores focus to `restoreFocusRef` (or whatever was focused on activation)
 * when it deactivates. Mirrors the Navbar search-dialog trap; reused by the
 * mobile nav drawer (B22) and the admin media picker (B35).
 *
 * Pass stable `onClose` / refs (e.g. a setState updater, which React keeps
 * stable) so the effect only re-runs when `active` changes.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  restoreFocusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const toRestore =
      restoreFocusRef?.current ??
      (document.activeElement as HTMLElement | null);

    const focusables = (): HTMLElement[] =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
          ).filter(
            (el) =>
              el.getAttribute("aria-hidden") !== "true" &&
              el.offsetParent !== null,
          )
        : [];

    // Move focus into the container when the trap activates.
    focusables()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const els = focusables();
      if (els.length === 0) {
        event.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      toRestore?.focus?.();
    };
  }, [active, containerRef, onClose, restoreFocusRef]);
}
