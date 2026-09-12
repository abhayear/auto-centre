-- AlterTable
ALTER TABLE "CreditNoteItcCase" ADD COLUMN "itcAvailedExtent" TEXT;
ALTER TABLE "CreditNoteItcCase" ADD COLUMN "itcAvailedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "CreditNoteItcCase"
SET "itcAvailedExtent" = CASE WHEN "itcAlreadyClaimed" THEN 'full' ELSE 'none' END
WHERE "itcAvailedExtent" IS NULL;

ALTER TABLE "CreditNoteItcCase" ALTER COLUMN "itcAvailedExtent" SET NOT NULL;
ALTER TABLE "CreditNoteItcCase" ALTER COLUMN "itcAvailedExtent" SET DEFAULT 'full';
