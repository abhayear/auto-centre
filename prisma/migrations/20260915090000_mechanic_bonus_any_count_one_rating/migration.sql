CREATE TEMP TABLE "MechanicBonusRating_old" AS
SELECT * FROM "MechanicBonusRating";

ALTER TABLE "MechanicBonusRoster" ADD COLUMN "names" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "MechanicBonusRoster"
SET "names" = ARRAY_REMOVE(ARRAY["mechanic1Name", "mechanic2Name", "mechanic3Name"], '');

ALTER TABLE "MechanicBonusRoster"
DROP COLUMN "mechanic1Name",
DROP COLUMN "mechanic2Name",
DROP COLUMN "mechanic3Name";

ALTER TABLE "MechanicBonusRating" ADD COLUMN "mechanicName" TEXT,
ADD COLUMN "rating" INTEGER;

UPDATE "MechanicBonusRating"
SET "mechanicName" = "mechanic1Name",
    "rating" = "mechanic1Rating";

INSERT INTO "MechanicBonusRating" ("id", "billNo", "mechanicName", "rating", "createdAt")
SELECT 'c' || substr(md5(random()::text || "id" || '2'), 1, 24), "billNo", "mechanic2Name", "mechanic2Rating", "createdAt"
FROM "MechanicBonusRating_old"
WHERE COALESCE("mechanic2Name", '') <> '';

INSERT INTO "MechanicBonusRating" ("id", "billNo", "mechanicName", "rating", "createdAt")
SELECT 'c' || substr(md5(random()::text || "id" || '3'), 1, 24), "billNo", "mechanic3Name", "mechanic3Rating", "createdAt"
FROM "MechanicBonusRating_old"
WHERE COALESCE("mechanic3Name", '') <> '';

ALTER TABLE "MechanicBonusRating"
DROP COLUMN "mechanic1Name",
DROP COLUMN "mechanic1Rating",
DROP COLUMN "mechanic2Name",
DROP COLUMN "mechanic2Rating",
DROP COLUMN "mechanic3Name",
DROP COLUMN "mechanic3Rating";

ALTER TABLE "MechanicBonusRating"
ALTER COLUMN "mechanicName" SET NOT NULL,
ALTER COLUMN "rating" SET NOT NULL;

CREATE INDEX "MechanicBonusRating_mechanicName_idx" ON "MechanicBonusRating"("mechanicName");
