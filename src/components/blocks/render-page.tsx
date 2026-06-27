import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { resolveBlockContents } from "@/lib/media-resolve";
import { parsePublishedSnapshot } from "@/lib/page-publish";
import { getServerLang } from "@/lib/lang";
import { localizeBlockContents } from "@/lib/translate/blocks";
import { parseBlockContent, serializeBlockContent } from "@/lib/blocks/validate";

/**
 * Server helper that renders a page's blocks, in order, wrapped in the shared
 * <main id="main-content"> landmark. Pages call this between <Navbar /> and
 * <Footer />.
 *
 * By default the *published* snapshot is rendered (what the public site shows).
 * Pass `{ draft: true }` (used by the admin preview route) to render the current
 * live/draft blocks instead. A page that has never been published falls back to
 * its live blocks so it still renders before the first publish.
 */
export async function renderPageBlocks(
  slug: string,
  opts: { draft?: boolean } = {},
): Promise<ReactNode> {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: {
      blocks: {
        where: { isVisible: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!page) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[renderPageBlocks] No page found for slug: "${slug}"`);
    }
    return <main id="main-content" />;
  }

  const useDraft = opts.draft || page.publishedContent == null;
  // Draft blocks key on their stable PageBlock id (so client-component state in
  // the live-editing preview survives reorders/inserts). The published snapshot
  // has no ids — and can't carry them without breaking change-detection, since
  // discard/restore recreate rows with new ids — but it's a static, append-only
  // server render reloaded fresh on each publish, so a positional key is safe.
  const blocks = useDraft
    ? page.blocks.map((b) => ({ key: `block-${b.id}`, type: b.type, content: b.content }))
    : parsePublishedSnapshot(page.publishedContent).map((b, i) => ({
        key: `published-${i}`,
        type: b.type,
        content: b.content,
      }));

  // Resolve any "media:{id}" image references to their current file paths so
  // block components keep receiving plain path strings.
  const contents = await resolveBlockContents(blocks.map((b) => b.content));

  // When the visitor has chosen 中文, swap in cached machine translations for the
  // admin-authored copy (read-only: cache miss falls back to the English source,
  // never a live API call). Study-detail pages render through a different path and
  // keep their manual, board-approved translations.
  let renderContents = contents;
  const lang = await getServerLang();
  if (lang === "ZH") {
    const parsed = contents.map((c) => parseBlockContent(c));
    const localized = await localizeBlockContents(
      blocks.map((b, i) => ({ type: b.type, content: parsed[i] })),
      "ZH",
    );
    renderContents = localized.map((c) => serializeBlockContent(c));
  }

  return (
    <main id="main-content">
      {blocks.map((block, i) => (
        <BlockRenderer
          key={block.key}
          type={block.type}
          content={renderContents[i]}
        />
      ))}
    </main>
  );
}
