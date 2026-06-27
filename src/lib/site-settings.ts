import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_FAVICON,
  DEFAULT_LOGO_LIGHT,
  DEFAULT_LOGO_DARK,
  DEFAULT_DONATE_URL,
  type SiteBranding,
} from "@/lib/branding";

// Site branding (favicon + navbar logos), editable from /admin/site-settings.
// Stored as a singleton SiteSettings row (id = 1) where an empty string means
// "use the built-in default asset" (constants in src/lib/branding.ts).

export const SITE_SETTINGS_CACHE_TAG = "site-settings";

/**
 * The raw stored row (empty strings preserved) — what the admin UI edits, so
 * it can tell "default" apart from an explicit upload. Missing row (fresh DB)
 * reads as all-defaults.
 */
export async function getRawSiteSettings(): Promise<SiteBranding> {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return {
    faviconPath: row?.faviconPath ?? "",
    logoLightPath: row?.logoLightPath ?? "",
    logoDarkPath: row?.logoDarkPath ?? "",
    donateUrl: row?.donateUrl ?? "",
  };
}

/**
 * Resolved branding for rendering: empty fields fall back to the built-in
 * defaults. Cached across requests (the navbar renders on every page — an
 * uncached read would cost a DB query per request); the admin save route
 * revalidates the tag.
 */
const cachedSiteSettings = unstable_cache(
  async (): Promise<SiteBranding> => {
    const raw = await getRawSiteSettings();
    return {
      faviconPath: raw.faviconPath || DEFAULT_FAVICON,
      logoLightPath: raw.logoLightPath || DEFAULT_LOGO_LIGHT,
      logoDarkPath: raw.logoDarkPath || DEFAULT_LOGO_DARK,
      donateUrl: raw.donateUrl || DEFAULT_DONATE_URL,
    };
  },
  ["site-settings"],
  { tags: [SITE_SETTINGS_CACHE_TAG] },
);

// React.cache memoises within a single render, so the root layout's two reads
// (generateMetadata for the favicon, RootLayout for the logos) share one
// unstable_cache lookup instead of two; unstable_cache then caches across
// requests and is revalidated by the admin save route.
export const getSiteSettings = cache(cachedSiteSettings);
