// Server-only data accessor for the public studies listing. Lets server
// components read studies straight from the DB instead of HTTP-fetching
// /api/studies during render, while keeping the same 中文 cached-translation
// behaviour so both code paths stay in sync.
import "server-only";
import { prisma } from "@/lib/prisma";
import { localizeStrings } from "@/lib/translate/blocks";
import { PUBLIC_STUDY_WHERE } from "@/lib/data/study-filters";

export type StudyListItem = {
  id: number;
  slug: string;
  title: string;
  shortDescription: string | null;
  imagePath: string | null;
};

const studyListSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  imagePath: true,
} as const;

/**
 * Active studies for the public studies listing, ordered by display order.
 *
 * Mirrors GET /api/studies: for 中文 the model-sourced title + short description
 * are swapped for cached machine translations (read-only lookup — a miss falls
 * back to the English source, never a live API call). Server components call
 * this directly instead of HTTP-fetching /api/studies during render; on a
 * language toggle the page re-renders via router.refresh(), so this re-runs
 * against the new cookie language. Study *detail* pages keep their manual,
 * board-approved translations and are untouched.
 */
export async function getStudies(
  lang: "EN" | "ZH",
): Promise<StudyListItem[]> {
  const studies = await prisma.study.findMany({
    where: PUBLIC_STUDY_WHERE,
    orderBy: { order: "asc" },
    select: studyListSelect,
  });

  if (lang === "ZH") {
    const [titles, shorts] = await Promise.all([
      localizeStrings(
        studies.map((s) => s.title),
        "ZH",
      ),
      localizeStrings(
        studies.map((s) => s.shortDescription ?? ""),
        "ZH",
      ),
    ]);
    return studies.map((s, i) => ({
      ...s,
      title: titles[i],
      shortDescription: s.shortDescription == null ? null : shorts[i],
    }));
  }

  return studies;
}
