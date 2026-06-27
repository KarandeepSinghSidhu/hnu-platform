"use client";

import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  type: "collaborating" | "industry";
};

export default function PartnerSectionText({ type }: Props) {
  const { t } = useLanguage();

  return (
    <>
      {type === "collaborating"
        ? t.home.collaboratingPartners
        : t.home.currentIndustryPartners}
    </>
  );
}