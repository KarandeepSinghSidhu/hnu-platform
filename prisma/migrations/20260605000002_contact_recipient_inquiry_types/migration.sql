-- AlterTable: ContactRecipient becomes the inquiry-type source of truth.
ALTER TABLE "ContactRecipient" ADD COLUMN "labelEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactRecipient" ADD COLUMN "labelZh" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactRecipient" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContactRecipient" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ContactRecipient_isArchived_order_idx" ON "ContactRecipient"("isArchived", "order");

-- Backfill the six original categories with the labels that previously lived
-- in src/messages/en.ts / zh.ts (so the form renders identically). Idempotent:
-- only touches rows whose labelEn is still empty.
UPDATE "ContactRecipient" SET "labelEn" = 'Study Participant Enquiry', "labelZh" = '研究参与者咨询', "order" = 1 WHERE "category" = 'Study Participant Enquiry' AND "labelEn" = '';
UPDATE "ContactRecipient" SET "labelEn" = 'Industry Partnership', "labelZh" = '行业合作', "order" = 2 WHERE "category" = 'Industry Partnership' AND "labelEn" = '';
UPDATE "ContactRecipient" SET "labelEn" = 'Internship or PhD Opportunity', "labelZh" = '实习或博士机会', "order" = 3 WHERE "category" = 'Internship or PhD Opportunity' AND "labelEn" = '';
UPDATE "ContactRecipient" SET "labelEn" = 'Donation', "labelZh" = '捐赠', "order" = 4 WHERE "category" = 'Donation' AND "labelEn" = '';
UPDATE "ContactRecipient" SET "labelEn" = 'General Enquiry', "labelZh" = '一般咨询', "order" = 5 WHERE "category" = 'General Enquiry' AND "labelEn" = '';
UPDATE "ContactRecipient" SET "labelEn" = 'Other', "labelZh" = '其他', "order" = 6 WHERE "category" = 'Other' AND "labelEn" = '';
