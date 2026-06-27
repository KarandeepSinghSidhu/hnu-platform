"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { NewTabHint } from "@/components/ui/NewTabHint";
import { publicationHref } from "@/lib/safe-url";
import { clampPositiveInt } from "@/lib/clamp";
import type { IndexPublicationRecord } from "@/lib/data/publications";

type Publication = IndexPublicationRecord;

function buildAuthorsText(publication: Publication) {
  if (publication.authorsRaw.trim()) return publication.authorsRaw;
  return publication.authors.map((author) => author.teamMember.name).join(", ");
}

// Publications are read on the server (getPublications: approved + visible,
// narrow select) and passed in as props, so the research index is in the initial
// HTML. Stays a client component for the search / year filter / pagination.
export default function PublicationIndex({
  pageSize = 10,
  publications = [],
}: {
  pageSize?: number;
  publications?: Publication[];
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // pageSize comes from CMS block config, so coerce to a positive integer
  // (capped) before it feeds the pagination math — guards against negative,
  // zero, or fractional values producing Infinity/empty pages.
  const size = clampPositiveInt(pageSize, { fallback: 10, max: 100 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publications.filter((p) => {
      const matchesYear =
        selectedYear === "All" || String(p.year ?? "") === selectedYear;
      const searchable = [
        p.title,
        p.authorsRaw,
        p.journal ?? "",
        p.abstract ?? "",
        p.category?.name ?? "",
        p.pubType,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !q || searchable.includes(q);
      return matchesYear && matchesQuery;
    });
  }, [publications, query, selectedYear]);

  const totalPages = Math.ceil(filtered.length / size);

  const paginatedPublications = useMemo(() => {
    const start = (currentPage - 1) * size;
    return filtered.slice(start, start + size);
  }, [filtered, currentPage, size]);

  const renderPagination = () => (
    <div className="flex items-center justify-center gap-3 py-4">
      <button
        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-full border-[1.5px] border-[#0c0c48] text-sm disabled:opacity-40 text-[#0c0c48] font-normal"
      >
        {t.research.previous}
      </button>

      <span className="text-sm text-[#0c0c48] font-semibold">
        {t.research.page} {currentPage} {t.research.of} {totalPages || 1}
      </span>

      <button
        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages || 1))}
        disabled={currentPage === totalPages || totalPages === 0}
        className="px-4 py-2 rounded-full border-[1.5px] border-[#0c0c48] text-sm disabled:opacity-40 text-[#0c0c48] font-normal"
      >
        {t.research.next}
      </button>
    </div>
  );

  const availableYears = useMemo(() => {
    const years = publications
      .map((p) => p.year)
      .filter((y): y is number => typeof y === "number")
      .sort((a, b) => b - a);
    return ["All", ...Array.from(new Set(years)).map(String)];
  }, [publications]);

  return (
    <section className="relative w-full bg-white py-16 px-6 sm:px-12 lg:px-45 overflow-hidden">
      <div className="mx-auto max-w-[1412px]">
        <div className="flex flex-col gap-8">
          {/* Filters bar — full width on top */}
          <div className="bg-white rounded-[30px] shadow-[0px_0px_30px_0px_rgba(0,0,0,0.25)] p-7">
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex-1 min-w-[200px]">
                <label
                  htmlFor="publication-search"
                  className="mb-2 block text-sm font-semibold text-[#0c0c48]"
                >
                  {t.research.search}
                </label>
                <input
                  id="publication-search"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t.research.searchPlaceholder}
                  className="w-full px-4 py-2.5 border-2 border-[#cac7c7] rounded-full text-sm text-[#0c0c48] placeholder:text-[#8e8d8d] focus:outline-none focus:border-[#0c0c48] transition-colors"
                />
              </div>

              <div className="min-w-[160px]">
                <label
                  htmlFor="publication-year"
                  className="mb-2 block text-sm font-semibold text-[#0c0c48]"
                >
                  {t.research.year}
                </label>
                <select
                  id="publication-year"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 border-2 border-[#cac7c7] rounded-full text-sm text-[#0c0c48] focus:outline-none focus:border-[#0c0c48] transition-colors"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year === "All" ? t.research.allYears : year}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm font-semibold text-[#0c0c48]/70 pb-2">
                {filtered.length}{" "}
                {filtered.length === 1 ? t.research.result : t.research.results}
              </p>
            </div>
          </div>

          {/* Main content card */}
          <div className="bg-white rounded-[30px] shadow-[0px_0px_30px_0px_rgba(0,0,0,0.25)] p-8 sm:p-10">
            <header className="mb-8">
              {/* h2, not h1: the only page that renders this block (/research)
                  already has its h1 in researchHero — avoid a second page h1. */}
              <h2 className="text-3xl sm:text-4xl lg:text-[48px] font-extrabold text-[#0c0c48] tracking-[0.96px]">
                {t.research.publicationsTitle}
              </h2>
              <p className="mt-3 text-base text-[#0c0c48] max-w-2xl">
                {t.research.publicationsIntro}
              </p>
            </header>

            {renderPagination()}

            {filtered.length === 0 ? (
              <div className="bg-[#f5f5f7] rounded-2xl px-6 py-12 text-center text-[#0c0c48]/80">
                {t.research.noPublications}
              </div>
            ) : (
              <div className="space-y-5">
                {paginatedPublications.map((publication) => {
                  const publicationUrl = publicationHref(publication);
                  const authorsText = buildAuthorsText(publication);

                  return (
                    <article
                      key={publication.id}
                      className="bg-white rounded-[20px] border border-[#0c0c48]/15 p-6 transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:outline hover:outline-2 hover:outline-[#0c0c48] hover:outline-offset-[6px]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#0c0c48]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0c0c48]">
                              {publication.pubType}
                            </span>
                            {publication.category?.name && (
                              <span className="rounded-full bg-[#0c0c48]/5 px-3 py-1 text-xs font-medium text-[#0c0c48]/80">
                                {publication.category.name}
                              </span>
                            )}
                          </div>

                          <h2 className="text-lg sm:text-xl font-bold leading-snug text-[#0c0c48]">
                            {publication.title}
                          </h2>

                          <div className="mt-3 space-y-1 text-sm text-[#0c0c48]/80">
                            {authorsText && <p>{authorsText}</p>}
                            <p className="italic">
                              {[publication.journal, publication.year]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          </div>

                          {publication.abstract && (
                            <p className="mt-4 text-sm leading-6 text-[#3d3d3d]">
                              {publication.abstract}
                            </p>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3">
                            {publicationUrl && (
                              <a
                                href={publicationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center bg-[#0c0c48] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#080830] transition-colors"
                              >
                                {t.research.viewPublication}
                                <NewTabHint />
                              </a>
                            )}
                            {publication.doi && (
                              <span className="inline-flex items-center rounded-full border border-[#0c0c48]/30 px-4 py-2 text-xs font-medium text-[#0c0c48]">
                                DOI: {publication.doi}
                              </span>
                            )}
                          </div>
                        </div>

                        {publication.year && (
                          <div className="shrink-0 text-3xl font-extrabold text-[#0c0c48]/40 tabular-nums">
                            {publication.year}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
                {filtered.length > 0 && renderPagination()}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
