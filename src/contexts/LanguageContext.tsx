"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries";

type Language = "EN" | "ZH";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "EN",
  setLang: () => {},
  // The real dictionary is always supplied by the provider; this placeholder
  // only satisfies the default context value without bundling a dictionary.
  t: {} as Dictionary,
});

export function LanguageProvider({
  children,
  initialLang = "EN",
  dict,
}: {
  children: ReactNode;
  // Seeded from the `lang` cookie on the server (see getServerLang), so the first
  // paint already matches the visitor's choice — no English flash, no hydration
  // mismatch.
  initialLang?: Language;
  // The active-language dictionary, loaded on the server (getDictionary) and
  // passed down so only one language's strings ship to the client.
  dict: Dictionary;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(initialLang);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Persist the choice (the cookie is what the server reads) and reflect it on
    // <html lang> for accessibility.
    localStorage.setItem("lang", lang);
    document.cookie = `lang=${lang}; path=/; max-age=31536000`;
    // Use the precise BCP-47 subtag for Simplified Chinese (matches the
    // server-rendered <html lang> in src/app/layout.tsx — B54.1).
    document.documentElement.lang = lang === "ZH" ? "zh-Hans" : "en";

    // Skip the initial mount — the server already rendered in `initialLang`, so
    // there's nothing to re-fetch. On a genuine change, refresh re-renders the
    // server components (page blocks) against the updated cookie, translating
    // the rest of the site to match.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    router.refresh();
  }, [lang, router]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
