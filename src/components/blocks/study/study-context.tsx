"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export type StudyLang = "en" | "zh";

export interface StudyData {
  slug: string;
  title: string;
  fullDescriptionEn: string;
  fullDescriptionZh: string;
  eligibilityEn: string;
  eligibilityZh: string;
  compensationEn: string;
  compensationZh: string;
  redcapUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneZh: string;
  ethicsStatement: string;
  status: string;
  publishedAt: string | null;
  pdfs: { id: number; title: string; fileName: string }[];
}

interface StudyContextValue {
  study: StudyData;
  lang: StudyLang;
  setLang: (lang: StudyLang) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({
  study,
  children,
}: {
  study: StudyData;
  children: ReactNode;
}) {
  // Derive the study language from the single global toggle so the Navbar
  // EN/ZH switch controls study content too (one toggle for the whole site).
  // The study blocks' own toggle delegates back to the same global state.
  const { lang: globalLang, setLang: setGlobalLang } = useLanguage();
  const lang: StudyLang = globalLang === "ZH" ? "zh" : "en";
  const setLang = (next: StudyLang) =>
    setGlobalLang(next === "zh" ? "ZH" : "EN");
  return (
    <StudyContext.Provider value={{ study, lang, setLang }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error("Study blocks must be rendered within a StudyProvider");
  }
  return ctx;
}
