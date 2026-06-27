// Admin CRUD for a single publication by id.
//   GET    → full publication with category + ordered authors (and team-member refs)
//   PATCH  → partial update; only whitelisted fields are written, all trimmed/normalised
//   DELETE → hard delete, but writes a tombstone first so the ORCID/OpenAlex sync
//            won't re-create the work on its next run
// Two manual-decision invariants the importer must respect: approving/rejecting a
// publication sets reviewedManually so the sync won't overwrite the status, and
// deletion is recorded as a DeletedPublication tombstone in the same transaction.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicationDedupKey } from "@/lib/publication-filter";

const ALLOWED_STATUSES = new Set(["Pending", "Approved", "Rejected"]);

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid publication id." },
        { status: 400 },
      );
    }
    const publication = await prisma.publication.findUnique({
      where: { id },
      include: {
        category: true,
        authors: {
          orderBy: { order: "asc" },
          include: {
            teamMember: {
              select: { id: true, name: true, title: true, section: true },
            },
          },
        },
      },
    });
    if (!publication) {
      return NextResponse.json(
        { error: "Publication not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(publication);
  } catch (error) {
    console.error("GET /api/admin/publications/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch publication." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid publication id." },
        { status: 400 },
      );
    }

    const existing = await prisma.publication.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Publication not found." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.authorsRaw === "string")
      updates.authorsRaw = body.authorsRaw.trim();
    if (typeof body.journal === "string" || body.journal === null)
      updates.journal = body.journal ? body.journal.trim() : null;
    if (typeof body.year === "number" || body.year === null)
      updates.year = body.year;
    if (typeof body.doi === "string" || body.doi === null)
      updates.doi = body.doi ? body.doi.trim() : null;
    if (typeof body.pubType === "string")
      updates.pubType = body.pubType.trim() || "Journal Article";
    if (typeof body.url === "string" || body.url === null)
      updates.url = body.url ? body.url.trim() : null;
    if (typeof body.abstract === "string" || body.abstract === null)
      updates.abstract = body.abstract ? body.abstract.trim() : null;
    if (typeof body.affiliation === "string" || body.affiliation === null)
      updates.affiliation = body.affiliation
        ? body.affiliation.trim()
        : null;
    if (typeof body.status === "string" && ALLOWED_STATUSES.has(body.status)) {
      updates.status = body.status;
      // A status change here is an explicit human decision (approve/reject).
      // Mark it so the ORCID sync won't clobber it on the next run.
      updates.reviewedManually = true;
    }
    if (typeof body.isVisible === "boolean") updates.isVisible = body.isVisible;
    if (typeof body.hiddenManually === "boolean")
      updates.hiddenManually = body.hiddenManually;
    if (body.categoryId === null || typeof body.categoryId === "number")
      updates.categoryId = body.categoryId;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    const updated = await prisma.publication.update({
      where: { id },
      data: updates,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/publications/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update publication." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid publication id." },
        { status: 400 },
      );
    }
    const existing = await prisma.publication.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Publication not found." },
        { status: 404 },
      );
    }
    // Hard delete, but first write a tombstone so the ORCID/OpenAlex sync won't
    // re-create this work on its next run. We record three identity signals — the
    // composite source id, the normalized DOI, and the title+year dedup key — and
    // the sync skips any incoming work that matches any of them. Wrapped in a
    // transaction so a row is never deleted without its tombstone.
    await prisma.$transaction([
      prisma.deletedPublication.create({
        data: {
          sourceType: existing.sourceType,
          sourceId: existing.sourceId,
          doi: existing.doi?.trim().toLowerCase() || null,
          titleYearKey: buildPublicationDedupKey({
            title: existing.title,
            year: existing.year,
          }),
          title: existing.title,
          year: existing.year,
        },
      }),
      prisma.publication.delete({ where: { id } }),
    ]);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/admin/publications/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete publication." },
      { status: 500 },
    );
  }
}
