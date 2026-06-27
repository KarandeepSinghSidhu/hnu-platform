import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// The `studiesContactCard` block was retired (removed from the registry and the
// renderer). This strips any leftover instance from everywhere it's stored so
// the public site never logs an "[BlockRenderer] Unknown block type" error and
// snapshots/revisions stay tidy: (1) live PageBlock rows, (2) every
// Page.publishedContent snapshot, (3) every PageRevision.content (incl.
// "Original"). Idempotent — re-running finds nothing. Run against each DB:
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/remove-studies-contact-card.ts
// PROD (use the Node 22 binary so the better-sqlite3 native module loads):
//   DATABASE_URL="file:/var/data/app.db" npx tsx prisma/remove-studies-contact-card.ts
const TYPE = "studiesContactCard";

// A `row` block stores its children inside its own content (a JSON string of
// { columns: RowChild[][], widths }). Strip TYPE children from those columns.
// Returns the new content string only when something changed.
function stripRowContent(content: unknown): string | null {
  if (typeof content !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const columns = (parsed as { columns?: unknown }).columns;
  if (!Array.isArray(columns)) return null;
  let changed = false;
  const newColumns = columns.map((col) => {
    if (!Array.isArray(col)) return col;
    return col.filter((child) => {
      const drop =
        child && typeof child === "object" && !Array.isArray(child) &&
        (child as { type?: unknown }).type === TYPE;
      if (drop) changed = true;
      return !drop;
    });
  });
  if (!changed) return null;
  return JSON.stringify({ ...(parsed as object), columns: newColumns });
}

// A snapshot/revision is a JSON array of { type, content }. Drop matching
// top-level entries AND strip TYPE children nested inside any `row` block.
// Returns the new JSON only when something actually changed.
function stripFromSnapshot(json: string | null): {
  changed: boolean;
  out: string | null;
} {
  if (!json) return { changed: false, out: json };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { changed: false, out: json };
  }
  if (!Array.isArray(parsed)) return { changed: false, out: json };
  let changed = false;
  const out = (parsed as { type?: unknown; content?: unknown }[])
    .filter((b) => {
      const drop = b?.type === TYPE;
      if (drop) changed = true;
      return !drop;
    })
    .map((b) => {
      if (b?.type === "row") {
        const newContent = stripRowContent(b.content);
        if (newContent !== null) {
          changed = true;
          return { ...b, content: newContent };
        }
      }
      return b;
    });
  if (!changed) return { changed: false, out: json };
  return { changed: true, out: JSON.stringify(out) };
}

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1a. Live draft blocks (top-level).
    const deleted = await prisma.pageBlock.deleteMany({ where: { type: TYPE } });

    // 1b. Live `row` blocks that embed TYPE as a column child (not a separate row).
    let rowsUpdated = 0;
    const rowBlocks = await prisma.pageBlock.findMany({
      where: { type: "row" },
      select: { id: true, content: true },
    });
    for (const rb of rowBlocks) {
      const newContent = stripRowContent(rb.content);
      if (newContent === null) continue;
      await prisma.pageBlock.update({
        where: { id: rb.id },
        data: { content: newContent },
      });
      rowsUpdated++;
    }

    // 2. Published snapshots.
    let pagesUpdated = 0;
    const pages = await prisma.page.findMany({
      select: { id: true, slug: true, publishedContent: true },
    });
    for (const page of pages) {
      const { changed, out } = stripFromSnapshot(page.publishedContent);
      if (!changed) continue;
      await prisma.page.update({
        where: { id: page.id },
        data: { publishedContent: out },
      });
      pagesUpdated++;
      console.log(`✓ ${page.slug}: removed ${TYPE} from published snapshot`);
    }

    // 3. Revisions (incl. the "Original" baseline).
    let revisionsUpdated = 0;
    const revisions = await prisma.pageRevision.findMany({
      select: { id: true, content: true },
    });
    for (const rev of revisions) {
      const { changed, out } = stripFromSnapshot(rev.content);
      if (!changed || out == null) continue;
      await prisma.pageRevision.update({
        where: { id: rev.id },
        data: { content: out },
      });
      revisionsUpdated++;
    }

    console.log(
      `Done. ${deleted.count} draft block(s), ${rowsUpdated} row block(s), ${pagesUpdated} snapshot(s), ${revisionsUpdated} revision(s) cleaned.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
