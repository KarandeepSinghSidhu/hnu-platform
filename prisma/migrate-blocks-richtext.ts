import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { getBlockDefinition } from "../src/lib/blocks/registry";

// Idempotent data migration for the "editable blocks + rich text" PR. Run after
// deploying that change (and on the dev DB):
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/migrate-blocks-richtext.ts
// Safe to run repeatedly. Two steps:
//   1. InfoCard `paragraphs: string[]` -> rich-text `body` HTML.
//   2. Blocks that became editable (page heroes, contact map) get their content
//      populated from the registry defaults so the admin editor shows the
//      original values. Only blocks with empty content are touched, so admin
//      edits are never overwritten. (Rendering is unaffected either way — the
//      renderer already falls back to these same defaults for empty content.)

const INFO_CARD_TYPES = new Set(["infoCardLeft", "infoCardRight"]);

const BACKFILL_FROM_DEFAULTS = new Set([
  "homepageHero",
  "discoverHero",
  "researchHero",
  "teamHero",
  "contactHero",
  "contactMap",
  "recentPublications",
  "ourPartners",
  "publicationIndex",
  "teamSections",
  "discoverVideo",
  "trialDesign",
  "contactDetails",
]);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraphsToHtml(paragraphs: unknown): string | null {
  if (!Array.isArray(paragraphs)) return null;
  const parts = paragraphs
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`);
  return parts.length > 0 ? parts.join("") : null;
}

function parseContent(content: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(content || "{}");
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });
  try {
    const blocks = await prisma.pageBlock.findMany();
    let migrated = 0;

    for (const block of blocks) {
      const content = parseContent(block.content);
      if (!content) continue;

      // 1. InfoCard paragraphs -> rich body.
      if (INFO_CARD_TYPES.has(block.type)) {
        const hasBody =
          typeof content.body === "string" && content.body.trim().length > 0;
        if (hasBody) continue;
        const html = paragraphsToHtml(content.paragraphs);
        if (!html) continue;
        const { paragraphs: _legacy, ...rest } = content;
        void _legacy;
        await prisma.pageBlock.update({
          where: { id: block.id },
          data: { content: JSON.stringify({ ...rest, body: html }) },
        });
        migrated++;
        console.log(`✓ richtext block #${block.id} (${block.type})`);
        continue;
      }

      // 2. Newly-editable frozen blocks: backfill empty content from defaults.
      if (
        BACKFILL_FROM_DEFAULTS.has(block.type) &&
        Object.keys(content).length === 0
      ) {
        const def = getBlockDefinition(block.type);
        if (def && Object.keys(def.defaultContent).length > 0) {
          await prisma.pageBlock.update({
            where: { id: block.id },
            data: { content: JSON.stringify(def.defaultContent) },
          });
          migrated++;
          console.log(`✓ backfilled block #${block.id} (${block.type})`);
        }
      }
    }

    console.log(`Done. Updated ${migrated} block(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
