-- Recover duplicate open alerts, keeping the oldest row for each signal.
WITH ranked_open_alerts AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "signal"
            ORDER BY "openedAt" ASC, "id" ASC
        ) AS row_number
    FROM "HealthAlert"
    WHERE "state" = 'open'
)
UPDATE "HealthAlert" AS alert
SET
    "state" = 'recovered',
    "recoveredAt" = COALESCE(alert."recoveredAt", CURRENT_TIMESTAMP),
    "fingerprint" = 'recovered:' || alert."id"
FROM ranked_open_alerts
WHERE alert."id" = ranked_open_alerts."id"
  AND ranked_open_alerts.row_number > 1;

-- Give the remaining open alert a stable fingerprint used by upsert.
UPDATE "HealthAlert"
SET "fingerprint" = 'open:' || "signal"
WHERE "state" = 'open';

-- CreateIndex
CREATE UNIQUE INDEX "HealthAlert_fingerprint_key" ON "HealthAlert"("fingerprint");
