// Server-only write helpers that mutate a page's live (draft) blocks. Kept
// separate from page-publish so revision-restore and discard-changes flows share
// one transactional snapshot-replace path.
import "server-only";
import { prisma } from "@/lib/prisma";
import type { PublishedBlock } from "@/lib/page-publish";

/**
 * Replaces a page's live (draft) blocks with the given snapshot, in order, in a
 * single transaction. Used to revert the draft to the published version
 * ("discard changes") and to restore a past revision into the draft.
 */
export async function replaceDraftBlocks(
  pageId: number,
  snapshot: PublishedBlock[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.pageBlock.deleteMany({ where: { pageId } });
    if (snapshot.length > 0) {
      await tx.pageBlock.createMany({
        data: snapshot.map((b, i) => ({
          pageId,
          type: b.type,
          content: b.content,
          position: i,
          isVisible: true,
        })),
      });
    }
  });
}
