// Admin API route that publishes a page editor's draft: it freezes the page's
// currently-visible blocks into the published copy the public site reads, and
// records a bounded revision history so prior layouts stay recoverable. Lives
// behind the admin console; the public site never writes here.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { snapshotBlocks, parsePublishedSnapshot } from "@/lib/page-publish";
import { parseBlockContent } from "@/lib/blocks/validate";
import { warmBlockTranslations } from "@/lib/translate/blocks";

export const runtime = "nodejs";

// Keep a bounded history of published versions per page.
const MAX_REVISIONS = 20;

// Publish a page: snapshot its current visible (draft) blocks into
// Page.publishedContent — what the public site renders — and record a revision.
/**
 * POST /api/admin/pages/[slug]/publish — promotes the page's draft to live.
 * Snapshots the page's visible blocks, updates the published copy, and appends a
 * "Published" revision atomically, pruning to the most recent MAX_REVISIONS while
 * always keeping the "Original" baseline. Returns 404 if the slug is unknown.
 * Translation pre-warming runs after commit and is best-effort: its failure does
 * not fail the publish.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        blocks: { where: { isVisible: true }, orderBy: { position: "asc" } },
      },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const snapshot = snapshotBlocks(page.blocks);
    const publishedAt = new Date();

    await prisma.$transaction(async (tx) => {
      // First publish only: preserve the existing (pre-edit) published version as
      // an "Original" revision so the page's original layout/order stays
      // recoverable from History. Without this, the earliest revision would be the
      // first *edited* version and the original would be lost forever.
      if (page.publishedContent) {
        const priorRevisions = await tx.pageRevision.count({
          where: { pageId: page.id },
        });
        if (priorRevisions === 0) {
          await tx.pageRevision.create({
            data: {
              pageId: page.id,
              content: page.publishedContent,
              label: "Original",
              // Keep its original publish time so it sorts oldest in History.
              ...(page.publishedAt ? { createdAt: page.publishedAt } : {}),
            },
          });
        }
      }

      await tx.page.update({
        where: { id: page.id },
        data: { publishedContent: snapshot, publishedAt },
      });
      await tx.pageRevision.create({
        data: { pageId: page.id, content: snapshot, label: "Published" },
      });
      // Prune anything beyond the most recent MAX_REVISIONS — but never the
      // "Original" baseline, so the starting point is always recoverable.
      const stale = await tx.pageRevision.findMany({
        where: { pageId: page.id, label: { not: "Original" } },
        orderBy: { createdAt: "desc" },
        skip: MAX_REVISIONS,
        select: { id: true },
      });
      if (stale.length > 0) {
        await tx.pageRevision.deleteMany({
          where: { id: { in: stale.map((r) => r.id) } },
        });
      }
    });

    // Pre-warm 中文 translations for the freshly published copy so public ZH
    // renders are pure cache hits (and keep working even with no live API key).
    // Best-effort: a translation failure must not fail an otherwise successful
    // publish, which has already committed above.
    try {
      const publishedBlocks = parsePublishedSnapshot(snapshot).map((b) => ({
        type: b.type,
        content: parseBlockContent(b.content),
      }));
      await warmBlockTranslations(publishedBlocks, "ZH");
    } catch (err) {
      console.error("Translation warm after publish failed (non-fatal):", err);
    }

    return NextResponse.json({ ok: true, publishedAt: publishedAt.toISOString() });
  } catch (error) {
    console.error("Failed to publish page:", error);
    return NextResponse.json(
      { error: "Failed to publish page" },
      { status: 500 },
    );
  }
}
