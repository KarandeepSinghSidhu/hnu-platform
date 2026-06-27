-- AlterTable
ALTER TABLE "ContactSubmission" ADD COLUMN "phone" TEXT;
ALTER TABLE "ContactSubmission" ADD COLUMN "prefersPhone" BOOLEAN NOT NULL DEFAULT false;
