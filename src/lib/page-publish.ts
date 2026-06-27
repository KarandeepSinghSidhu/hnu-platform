// Pure helpers for the page draft/publish snapshot format. No DB / server / React
// imports, so they're safe to use from server code, route handlers, and the
// seed/backfill scripts alike.

/** One entry in a published snapshot: a block's type and its raw content JSON. */
export interface PublishedBlock {
  type: string;
  content: string;
}

type BlockRow = { type: string; content: string; isVisible: boolean };

/**
 * Serializes a page's *visible* blocks (already ordered by position) into the
 * published-snapshot string stored on `Page.publishedContent`. Hidden blocks are
 * excluded — they aren't part of what the public site shows.
 */
export function snapshotBlocks(blocks: BlockRow[]): string {
  const visible = blocks
    .filter((b) => b.isVisible)
    .map((b) => ({ type: b.type, content: b.content }));
  return JSON.stringify(visible);
}

/** Tolerant parse of a published snapshot into ordered `[{ type, content }]`. */
export function parsePublishedSnapshot(
  json: string | null | undefined,
): PublishedBlock[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (x): x is PublishedBlock =>
        !!x &&
        typeof x === "object" &&
        typeof (x as PublishedBlock).type === "string" &&
        typeof (x as PublishedBlock).content === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Whether a page's live (draft) blocks differ from what's published. A page that
 * has never been published is considered to have unpublished changes. Both sides
 * use {@link snapshotBlocks}, so equal content compares exactly.
 */
export function hasUnpublishedChanges(
  publishedContent: string | null | undefined,
  liveBlocks: BlockRow[],
): boolean {
  if (publishedContent == null) return true;
  return snapshotBlocks(liveBlocks) !== publishedContent;
}
