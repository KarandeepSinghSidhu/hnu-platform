// Admin API for a page's revision history, keyed by slug.
//   GET    → lightweight list of revisions (newest first, with block counts)
//   DELETE → clears saved history, keeping only the "Original" baseline
// Read paths are unauthenticated here — access is gated by the admin layout/
// middleware that fronts /api/admin. The heavy snapshot payload is left to the
// restore endpoint; this route returns metadata only.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePublishedSnapshot } from "@/lib/page-publish";

export const runtime = "nodejs";

// List a page's saved revisions (most recent first). Returns lightweight
// metadata only — the full snapshot is fetched/applied by the restore endpoint.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const revisions = await prisma.pageRevision.findMany({
      where: { pageId: page.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, createdAt: true, content: true },
    });

    return NextResponse.json(
      revisions.map((r) => ({
        id: r.id,
        label: r.label,
        createdAt: r.createdAt,
        blockCount: parsePublishedSnapshot(r.content).length,
      })),
    );
  } catch (error) {
    console.error("Failed to list revisions:", error);
    return NextResponse.json(
      { error: "Failed to list revisions" },
      { status: 500 },
    );
  }
}

// Clear a page's saved history on demand, keeping only the "Original" baseline.
// Published versions accumulate fast when an admin publishes repeatedly to
// preview a full page; this lets them reset the log without waiting for the
// automatic prune in publish/route.ts. The Original is never deleted.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await prisma.pageRevision.deleteMany({
      where: { pageId: page.id, label: { not: "Original" } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to clear revisions:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 },
    );
  }
}
