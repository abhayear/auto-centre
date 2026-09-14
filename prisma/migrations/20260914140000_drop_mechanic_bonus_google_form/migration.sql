-- AlterTable
ALTER TABLE "MechanicBonusRoster" DROP COLUMN "googleFormUrl",
DROP COLUMN "entryBillNo",
DROP COLUMN "entryMechanic1Name",
DROP COLUMN "entryMechanic1Rating",
DROP COLUMN "entryMechanic2Name",
DROP COLUMN "entryMechanic2Rating",
DROP COLUMN "entryMechanic3Name",
DROP COLUMN "entryMechanic3Rating";

-- AlterTable
ALTER TABLE "MechanicBonusRating" DROP COLUMN "sentToGoogle",
DROP COLUMN "googleError";
