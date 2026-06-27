// Admin publications list endpoint backing the review console's library table.
// GET → paginated, filtered (status/search) publications plus the status-chip
// counts shown above the table. The chip counts are computed in one cheap
// groupBy and deliberately ignore the status filter (so chips stay library-wide)
// while still honouring search, so a single request feeds the whole view.
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = new Set(["Pending", "Approved", "Rejected"]);
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam && ALLOWED_STATUSES.has(statusParam) ? statusParam : null;
    const search = (url.searchParams.get("search") ?? "").trim();
    const page = parsePositiveInt(
      url.searchParams.get("page"),
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const pageSize = parsePositiveInt(
      url.searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const where: Prisma.PublicationWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { journal: { contains: search } },
        { authorsRaw: { contains: search } },
      ];
    }

    // Count chips are computed with groupBy/count (cheap) instead of fetching all
    // rows. `counts` ignores the status filter (so chips show library-wide totals)
    // but respects the search box so the chips track what's being searched.
    const countsWhere: Prisma.PublicationWhereInput = {};
    if (search) countsWhere.OR = where.OR;

    const [items, total, grouped] = await Promise.all([
      prisma.publication.findMany({
        where,
        // Most-recently-added first, in every tab (the status filter is applied
        // via `where`). `id` breaks ties for rows created in the same tick.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        // Minimal projection: only what the list table renders. The nested
        // author include is trimmed to id/name/order.
        select: {
          id: true,
          title: true,
          authorsRaw: true,
          journal: true,
          year: true,
          doi: true,
          pubType: true,
          url: true,
          status: true,
          isVisible: true,
          hiddenManually: true,
          reviewedManually: true,
          matchedKeywords: true,
          matchedAffiliation: true,
          relevanceReason: true,
          sourceType: true,
          category: { select: { id: true, name: true } },
          authors: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              teamMember: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.publication.count({ where }),
      prisma.publication.groupBy({
        by: ["status"],
        where: countsWhere,
        _count: { _all: true },
      }),
    ]);

    const counts = { total: 0, Pending: 0, Approved: 0, Rejected: 0 };
    for (const row of grouped) {
      const n = row._count._all;
      counts.total += n;
      if (row.status === "Pending") counts.Pending += n;
      else if (row.status === "Approved") counts.Approved += n;
      else if (row.status === "Rejected") counts.Rejected += n;
    }

    return NextResponse.json(
      {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        counts,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/admin/publications failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch publications." },
      { status: 500 },
    );
  }
}
