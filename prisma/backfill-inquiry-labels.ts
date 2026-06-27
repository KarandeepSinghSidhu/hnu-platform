import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { ORIGINAL_INQUIRY_TYPES } from "./inquiry-type-seed-data";

// Backfills ContactRecipient.labelEn/labelZh/order for the six original
// inquiry types (labels previously hardcoded in src/messages/en.ts / zh.ts).
// For environments updated via `prisma db push` (which skips the migration's
// backfill SQL). Idempotent: only touches rows whose labelEn is still empty.
// Label/order data is shared with the seed via ORIGINAL_INQUIRY_TYPES.
// Run:
//   DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/backfill-inquiry-labels.ts

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  try {
    let updated = 0;
    for (const { category, labelZh, order } of ORIGINAL_INQUIRY_TYPES) {
      const result = await prisma.contactRecipient.updateMany({
        where: { category, labelEn: "" },
        data: { labelEn: category, labelZh, order },
      });
      if (result.count > 0) {
        console.log(`• ${category}: labels backfilled`);
        updated += result.count;
      } else {
        console.log(`• ${category}: already labelled or missing — skipping`);
      }
    }
    console.log(`Done. ${updated} row(s) updated.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
