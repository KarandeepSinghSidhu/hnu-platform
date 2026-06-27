"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NavStudy } from "@/lib/nav-studies";

// Navbar Studies dropdown data, resolved on the server (getNavStudies) and
// seeded here by the root layout — mirrors SiteSettingsProvider / LanguageProvider.
// The dropdown therefore renders the right studies on first paint (no client
// fetch) and re-localises on a language toggle, which triggers router.refresh()
// and re-runs the server layout. `NavStudy` is imported type-only, so this
// client module never pulls in the server-only prisma import.

const NavStudiesContext = createContext<NavStudy[]>([]);

export function NavStudiesProvider({
  children,
  studies,
}: {
  children: ReactNode;
  studies: NavStudy[];
}) {
  return (
    <NavStudiesContext.Provider value={studies}>
      {children}
    </NavStudiesContext.Provider>
  );
}

export function useNavStudies() {
  return useContext(NavStudiesContext);
}
