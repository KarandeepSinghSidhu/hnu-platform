"use client";

import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Visually-hidden "(opens in new tab)" appended to the accessible name of
 * external links that use target="_blank", warning screen-reader users about the
 * context change (B54.3 / WCAG 3.2.5). Drop it inside the link, after its text.
 */
export function NewTabHint() {
  const { lang } = useLanguage();
  return (
    <span className="sr-only">
      {lang === "EN" ? " (opens in new tab)" : "（在新标签页中打开）"}
    </span>
  );
}
