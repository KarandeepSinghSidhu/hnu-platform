// Server-only Prisma read helpers for approved/visible publications, narrow-
// selected per view. Lets server components (homepage cards, /research index)
// read straight from the DB instead of HTTP-fetching the whole publications
// table and slicing it client-side — fewer rows and columns leave SQLite.
import "server-only";
import { prisma } from "@/lib/prisma";
import { clampPositiveInt } from "@/lib/clamp";

export type RecentPublicationRecord = {
  id: number;
  title: string;
  authorsRaw: string;
  journal: string | null;
  year: number | null;
  pubType: string;
  url: string | null;
  doi: string | null;
};

const recentPublicationSelect = {
  id: true,
  title: true,
  authorsRaw: true,
  journal: true,
  year: true,
  pubType: true,
  url: true,
  doi: true,
} as const;

/**
 * The `limit` most recent approved/visible publications, narrow-selected for the
 * homepage "Recent Publications" cards.
 *
 * Single source of truth shared by the RecentPublications server wrapper, which
 * calls this directly instead of HTTP-fetching the whole /api/publications table
 * and slicing it in the browser. `year: { not: null }` mirrors the old
 * client-side `.filter(p => p.year)`; ordering + take run in SQLite so only
 * `limit` rows (and only the 8 card fields) ever leave the database.
 */
export async function getRecentPublications(
  limit: number,
): Promise<RecentPublicationRecord[]> {
  // `limit` originates from CMS block config (Number(c.limit)), so clamp to a
  // safe integer range before it reaches Prisma's take.
  const take = clampPositiveInt(limit, { fallback: 1, max: 100 });
  return prisma.publication.findMany({
    where: {
      status: "Approved",
      isVisible: true,
      hiddenManually: false,
      year: { not: null },
    },
    orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    take,
    select: recentPublicationSelect,
  });
}

export type IndexPublicationRecord = {
  id: number;
  title: string;
  authorsRaw: string;
  journal: string | null;
  year: number | null;
  doi: string | null;
  pubType: string;
  url: string | null;
  abstract: string | null;
  category: { name: string } | null;
  authors: { teamMember: { name: string } }[];
};

const indexPublicationSelect = {
  id: true,
  title: true,
  authorsRaw: true,
  journal: true,
  year: true,
  doi: true,
  pubType: true,
  url: true,
  abstract: true,
  category: { select: { name: true } },
  authors: {
    orderBy: { order: "asc" },
    select: { teamMember: { select: { name: true } } },
  },
} as const;

/**
 * All approved/visible publications for the full /research index, narrow-selected
 * to exactly the fields PublicationIndex renders (no sync/createdAt metadata, no
 * nested author/category ids). Shared by the PublicationIndex server wrapper so
 * the research page no longer HTTP-fetches the table on mount. Ordered newest
 * first; the index paginates/filters client-side.
 */
export async function getPublications(): Promise<IndexPublicationRecord[]> {
  return prisma.publication.findMany({
    where: {
      status: "Approved",
      isVisible: true,
      hiddenManually: false,
    },
    orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    select: indexPublicationSelect,
  });
}
