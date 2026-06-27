/*
  Warnings:

  - You are about to drop the `MailingListEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "MailingListEntry_email_key";

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN "orcidId" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "profileUrl" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "yearsActive" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MailingListEntry";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ContactRecipient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StudyPdf" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyPdf_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicationCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "authorsRaw" TEXT NOT NULL DEFAULT '',
    "journal" TEXT,
    "year" INTEGER,
    "doi" TEXT,
    "pubType" TEXT NOT NULL DEFAULT 'Journal Article',
    "url" TEXT,
    "abstract" TEXT,
    "affiliation" TEXT,
    "orcidSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "categoryId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Publication_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PublicationCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicationAuthor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicationId" INTEGER NOT NULL,
    "teamMemberId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PublicationAuthor_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublicationAuthor_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnerLogo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "logoPath" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "group" TEXT NOT NULL DEFAULT 'Collaborating',
    "order" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_PartnerLogo" ("id", "isPlaceholder", "logoPath", "name", "order", "websiteUrl") SELECT "id", "isPlaceholder", "logoPath", "name", "order", "websiteUrl" FROM "PartnerLogo";
DROP TABLE "PartnerLogo";
ALTER TABLE "new_PartnerLogo" RENAME TO "PartnerLogo";
CREATE INDEX "PartnerLogo_group_order_idx" ON "PartnerLogo"("group", "order");
CREATE INDEX "PartnerLogo_order_idx" ON "PartnerLogo"("order");
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
    "status" TEXT NOT NULL DEFAULT 'Recruiting',
    "category" TEXT NOT NULL DEFAULT '',
    "publishedAt" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Study" ("compensationEn", "compensationZh", "contactEmail", "contactPhone", "contactPhoneZh", "createdAt", "eligibilityEn", "eligibilityZh", "ethicsStatement", "fullDescriptionEn", "fullDescriptionZh", "id", "imagePath", "isActive", "order", "redcapUrl", "shortDescription", "slug", "title", "updatedAt") SELECT "compensationEn", "compensationZh", "contactEmail", "contactPhone", "contactPhoneZh", "createdAt", "eligibilityEn", "eligibilityZh", "ethicsStatement", "fullDescriptionEn", "fullDescriptionZh", "id", "imagePath", "isActive", "order", "redcapUrl", "shortDescription", "slug", "title", "updatedAt" FROM "Study";
DROP TABLE "Study";
ALTER TABLE "new_Study" RENAME TO "Study";
CREATE UNIQUE INDEX "Study_slug_key" ON "Study"("slug");
CREATE INDEX "Study_isActive_order_idx" ON "Study"("isActive", "order");
CREATE INDEX "Study_status_idx" ON "Study"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ContactRecipient_category_key" ON "ContactRecipient"("category");

-- CreateIndex
CREATE INDEX "StudyPdf_studyId_order_idx" ON "StudyPdf"("studyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationCategory_name_key" ON "PublicationCategory"("name");

-- CreateIndex
CREATE INDEX "PublicationCategory_order_idx" ON "PublicationCategory"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_doi_key" ON "Publication"("doi");

-- CreateIndex
CREATE INDEX "Publication_status_year_idx" ON "Publication"("status", "year");

-- CreateIndex
CREATE INDEX "Publication_categoryId_idx" ON "Publication"("categoryId");

-- CreateIndex
CREATE INDEX "PublicationAuthor_teamMemberId_idx" ON "PublicationAuthor"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationAuthor_publicationId_teamMemberId_key" ON "PublicationAuthor"("publicationId", "teamMemberId");
