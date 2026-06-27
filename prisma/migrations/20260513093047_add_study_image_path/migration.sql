-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Study" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescriptionEn" TEXT NOT NULL,
    "fullDescriptionZh" TEXT NOT NULL,
    "eligibilityEn" TEXT NOT NULL,
    "eligibilityZh" TEXT NOT NULL,
    "compensationEn" TEXT NOT NULL,
    "compensationZh" TEXT NOT NULL,
    "redcapUrl" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactPhoneZh" TEXT NOT NULL,
    "ethicsStatement" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Study" (
    "compensationEn",
    "compensationZh",
    "contactEmail",
    "contactPhone",
    "contactPhoneZh",
    "createdAt",
    "eligibilityEn",
    "eligibilityZh",
    "ethicsStatement",
    "fullDescriptionEn",
    "fullDescriptionZh",
    "id",
    "imagePath",
    "isActive",
    "order",
    "redcapUrl",
    "shortDescription",
    "slug",
    "title",
    "updatedAt"
)
SELECT
    "compensationEn",
    "compensationZh",
    "contactEmail",
    "contactPhone",
    COALESCE("contactPhoneZh", ''),
    "createdAt",
    "eligibilityEn",
    "eligibilityZh",
    "ethicsStatement",
    "fullDescriptionEn",
    "fullDescriptionZh",
    "id",
    '',
    "isActive",
    "order",
    "redcapUrl",
    "shortDescription",
    "slug",
    "title",
    "updatedAt"
FROM "Study";
DROP TABLE "Study";
ALTER TABLE "new_Study" RENAME TO "Study";
CREATE UNIQUE INDEX "Study_slug_key" ON "Study"("slug");
CREATE INDEX "Study_isActive_order_idx" ON "Study"("isActive", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
