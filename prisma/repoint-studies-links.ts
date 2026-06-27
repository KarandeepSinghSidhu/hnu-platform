import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// The /studies overview route was removed; its links now point at the homepage
// studies section (/#studies). This repoints any stored block content that still
// links to the old route — most importantly the homepage hero's "JOIN A STUDY"
// button — so the live CTA doesn't 404 after the route is deleted.
//
// Replaces only the EXACT href value "/studies" (the quotes are part of the
// match), so individual study links like "/studies/nz-synergy" are untouched.
// Idempotent — re-running finds nothing to change. Run against each DB:
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/repoint-studies-links.ts
const FROM = '"/studies"';
const TO = '"/#studies"';

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  try {
    let blocksUpdated = 0;
    const blocks = await prisma.pageBlock.findMany({
      select: { id: true, content: true },
    });
    for (const block of blocks) {
      if (!block.content.includes(FROM)) continue;
      await prisma.pageBlock.update({
        where: { id: block.id },
        data: { content: block.content.replaceAll(FROM, TO) },
      });
      blocksUpdated++;
    }

    // The published snapshot is a JSON array of { type, content } where each
    // `content` is itself a JSON STRING (so its quotes are escaped). Parse it and
    // replace inside each block's content rather than string-replacing the
    // escaped form on the outer JSON.
    let pagesUpdated = 0;
    const pages = await prisma.page.findMany({
      select: { id: true, slug: true, publishedContent: true },
    });
    for (const page of pages) {
      if (!page.publishedContent) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(page.publishedContent);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;

      let changed = false;
      for (const block of parsed as { content?: unknown }[]) {
        if (typeof block?.content === "string" && block.content.includes(FROM)) {
          block.content = block.content.replaceAll(FROM, TO);
          changed = true;
        }
      }
      if (!changed) continue;

      await prisma.page.update({
        where: { id: page.id },
        data: { publishedContent: JSON.stringify(parsed) },
      });
      pagesUpdated++;
      console.log(`✓ ${page.slug}: repointed /studies → /#studies in snapshot`);
    }

    console.log(
      `Done. ${blocksUpdated} draft block(s) and ${pagesUpdated} published snapshot(s) updated.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
