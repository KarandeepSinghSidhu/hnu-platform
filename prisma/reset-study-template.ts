import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_STUDY_LAYOUT_BLOCKS } from "../src/components/blocks/study/study-default-layout";
import { STUDY_TEMPLATE_SLUG } from "../src/components/blocks/study/study-slugs";

// Rewrites the shared study-layout template (studylayout-__default__) to the
// code-defined default — same thing the admin "Reset to original" button does
// for the template. Use it to apply the two-column default to a DB without the
// admin UI (e.g. the prod template, which was a flat single-column layout). Safe
// to re-run; per-study overrides are untouched (they take precedence anyway).
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/reset-study-template.ts
async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const page = await prisma.page.upsert({
      where: { slug: STUDY_TEMPLATE_SLUG },
      update: { title: "Study layout template" },
      create: { slug: STUDY_TEMPLATE_SLUG, title: "Study layout template" },
    });

    const blockData = DEFAULT_STUDY_LAYOUT_BLOCKS.map((block, i) => ({
      pageId: page.id,
      type: block.type,
      content: JSON.stringify(block.content),
      position: i,
      isVisible: true,
    }));

    await prisma.$transaction([
      prisma.pageBlock.deleteMany({ where: { pageId: page.id } }),
      prisma.pageBlock.createMany({ data: blockData }),
    ]);

    console.log(
      `✓ Reset ${STUDY_TEMPLATE_SLUG} to the default ${blockData.length}-block layout (${blockData
        .map((b) => b.type)
        .join(", ")}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
