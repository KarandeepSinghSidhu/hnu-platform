import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { getImageDimensions } from "../src/lib/image-dimensions";

// Populates width/height for existing MediaAsset rows that don't have them yet
// (they were never captured before). Idempotent; run any time:
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/backfill-media-dimensions.ts

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });
  try {
    const assets = await prisma.mediaAsset.findMany({
      where: { OR: [{ width: null }, { height: null }] },
    });
    let updated = 0;
    for (const asset of assets) {
      const relative = asset.filePath.replace(/^\/+/, "");
      const fsPath = path.join(process.cwd(), "public", relative);
      let buffer: Buffer;
      try {
        buffer = await readFile(fsPath);
      } catch {
        console.warn(`• skip (file missing): ${asset.filePath}`);
        continue;
      }
      const dim = getImageDimensions(buffer);
      if (!dim) {
        console.warn(`• skip (no dimensions): ${asset.filePath}`);
        continue;
      }
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { width: dim.width, height: dim.height },
      });
      updated++;
      console.log(`✓ ${asset.filePath} → ${dim.width}×${dim.height}`);
    }
    console.log(`Done. Backfilled ${updated} asset(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
