"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_FAVICON,
  DEFAULT_LOGO_LIGHT,
  DEFAULT_LOGO_DARK,
  DEFAULT_DONATE_URL,
  type SiteBranding,
} from "@/lib/branding";

// Admin-configurable branding (favicon + navbar logos). The root layout reads
// the resolved values on the server (getSiteSettings) and seeds this provider,
// so client components like the Navbar render the right logo on first paint —
// same pattern as LanguageProvider. The defaults below only apply if a
// component is somehow rendered outside the provider.

const SiteSettingsContext = createContext<SiteBranding>({
  faviconPath: DEFAULT_FAVICON,
  logoLightPath: DEFAULT_LOGO_LIGHT,
  logoDarkPath: DEFAULT_LOGO_DARK,
  donateUrl: DEFAULT_DONATE_URL,
});

export function SiteSettingsProvider({
  children,
  settings,
}: {
  children: ReactNode;
  settings: SiteBranding;
}) {
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
