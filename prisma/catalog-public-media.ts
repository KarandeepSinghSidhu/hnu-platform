import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { getImageDimensions } from "../src/lib/image-dimensions";

// Catalogs the raster images already sitting in /public as MediaAsset rows so
// they show up in the media library and can be referenced/replaced/tracked.
// Idempotent (skips paths already in the DB). Run:
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/catalog-public-media.ts

const PUBLIC_DIR = path.join(process.cwd(), "public");
// uploads/* is managed through the upload flow already; don't re-catalog it.
const SKIP_DIRS = new Set(["uploads"]);
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path.join(dir, entry.name));
    } else if (IMAGE_EXT.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });
  try {
    let created = 0;
    let skipped = 0;
    for await (const fsPath of walk(PUBLIC_DIR)) {
      const relative = path
        .relative(PUBLIC_DIR, fsPath)
        .split(path.sep)
        .join("/");
      const filePath = `/${relative}`;

      const existing = await prisma.mediaAsset.findUnique({
        where: { filePath },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const buffer = await readFile(fsPath);
      const dim = getImageDimensions(buffer);
      const ext = (relative.split(".").pop() ?? "").toLowerCase();
      const fileStat = await stat(fsPath);

      await prisma.mediaAsset.create({
        data: {
          filePath,
          originalName: path.basename(relative),
          mimeType: MIME[ext] ?? "application/octet-stream",
          size: fileStat.size,
          width: dim?.width ?? null,
          height: dim?.height ?? null,
        },
      });
      created++;
      console.log(`✓ cataloged ${filePath}`);
    }
    console.log(
      `Done. Cataloged ${created} new image(s); ${skipped} already present.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
