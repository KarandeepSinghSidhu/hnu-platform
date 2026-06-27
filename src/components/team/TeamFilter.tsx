"use client";

import { useState, type ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type FilterKey = "all" | "board" | "research" | "alumni";

type FilterOption = {
  key: FilterKey;
  label: string;
  disabled?: boolean;
};

export default function TeamFilter({
  board,
  research,
  alumni,
  hasAlumni,
  defaultTab = "all",
}: {
  board: ReactNode;
  research: ReactNode;
  alumni: ReactNode;
  hasAlumni: boolean;
  defaultTab?: FilterKey;
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterKey>(defaultTab);

  const options: FilterOption[] = [
    { key: "all", label: t.team.filterAll },
    { key: "board", label: t.team.filterBoard },
    { key: "research", label: t.team.filterResearch },
    { key: "alumni", label: t.team.alumni, disabled: !hasAlumni },
  ];

  const show = (key: Exclude<FilterKey, "all">) =>
    filter === "all" || filter === key;

  return (
    <>
      <div className="bg-white pt-10 pb-2 px-6 sm:px-12 lg:px-45">
        <div
          className="mx-auto flex flex-wrap gap-3 justify-center"
          style={{ maxWidth: "1420px" }}
          role="group"
          aria-label="Filter team sections"
        >
          {options.map((option) => {
            const active = filter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                disabled={option.disabled}
                onClick={() => setFilter(option.key)}
                aria-pressed={active}
                className={`px-6 py-2 rounded-full text-sm sm:text-base font-semibold border-2 transition-colors ${
                  active
                    ? "bg-[#0c0c48] text-white border-[#0c0c48]"
                    : "bg-white text-[#0c0c48] border-[#0c0c48] hover:bg-[#0c0c48]/10"
                } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={show("board") ? "" : "hidden"}>{board}</div>
      <div className={show("research") ? "" : "hidden"}>{research}</div>
      <div className={show("alumni") ? "" : "hidden"}>{alumni}</div>
    </>
  );
}
