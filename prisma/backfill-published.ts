import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { snapshotBlocks } from "../src/lib/page-publish";

// Backfills Page.publishedContent for existing pages by snapshotting their
// current live blocks, so the public site renders identically after the
// draft/publish change ships. Idempotent (skips already-published pages). Run:
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/backfill-published.ts

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const pages = await prisma.page.findMany({
      include: { blocks: { orderBy: { position: "asc" } } },
    });

    let updated = 0;
    for (const page of pages) {
      if (page.publishedContent != null) {
        console.log(`• ${page.slug}: already published — skipping`);
        continue;
      }
      await prisma.page.update({
        where: { id: page.id },
        data: {
          publishedContent: snapshotBlocks(page.blocks),
          publishedAt: page.updatedAt,
        },
      });
      updated++;
      const visible = page.blocks.filter((b) => b.isVisible).length;
      console.log(`✓ ${page.slug}: published ${visible} visible block(s)`);
    }

    console.log(`Done. ${updated} page(s) backfilled.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
