// Site identity
export const SITE_NAME = "HNU Auckland";
// `||` (not `??`) so an EMPTY NEXT_PUBLIC_SITE_URL (e.g. a blank line in .env)
// still falls back — `new URL("")` in generateMetadata otherwise throws on every
// page and silently strips ALL metadata (title, description, noindex).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";


// UoA brand colours. Source of truth is the `:root` brand variables in
// `src/app/globals.css` (see docs/styling.md); keep these hexes in sync with them.
export const BRAND_COLORS = {
  /** Waitematā – Deep Blue. Primary background for navbars, headers, and key UI elements. */
  uoaWaitemata: "#0c0c48",
  /** Azure – Bright Blue. Secondary brand colour. */
  uoaAzure: "#1f2bd4",
  /** Māhina – Light Blue ("early morning light"). Secondary brand colour. */
  uoaMahina: "#00caef",
} as const;

// Audience categories for the contact form
export const CONTACT_AUDIENCE_CATEGORIES = [
  "Student",
  "Researcher / Academic",
  "Industry Partner",
  "Media",
  "General Public",
] as const;

export type ContactAudienceCategory = (typeof CONTACT_AUDIENCE_CATEGORIES)[number];
