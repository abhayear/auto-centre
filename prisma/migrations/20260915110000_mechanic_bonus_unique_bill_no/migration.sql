UPDATE "MechanicBonusRating"
SET "billNo" = upper(regexp_replace(trim("billNo"), '\s+', '', 'g'));

DELETE FROM "MechanicBonusRating" AS extra
USING "MechanicBonusRating" AS keep
WHERE extra."billNo" = keep."billNo"
  AND (
    extra."createdAt" > keep."createdAt"
    OR (extra."createdAt" = keep."createdAt" AND extra."id" > keep."id")
  );

DROP INDEX IF EXISTS "MechanicBonusRating_billNo_idx";

CREATE UNIQUE INDEX "MechanicBonusRating_billNo_key" ON "MechanicBonusRating"("billNo");
