-- Add EV mechanic role template and ATS evaluation fields
ALTER TABLE "JobPosting" ADD COLUMN "roleTemplate" TEXT NOT NULL DEFAULT 'general';

ALTER TABLE "JobApplication" ADD COLUMN "screeningResponses" JSONB;
ALTER TABLE "JobApplication" ADD COLUMN "evaluationScores" JSONB;

-- Upgrade existing EV service technician posting if present
UPDATE "JobPosting"
SET
  "title" = 'Two-Wheeler EV Service Mechanic',
  "department" = 'EV Service & Maintenance',
  "roleTemplate" = 'ev_mechanic',
  "description" = 'Diagnose and service electric two-wheelers (scooters, bikes, mopeds) at our Lalitpur workshop. Use EV diagnostic tools for battery, motor, and controller systems; maintain lithium-ion packs; service BLDC motors, inverters, and onboard chargers; perform routine brake, suspension, and tyre work; install firmware updates for smart dashboards; follow high-voltage safety protocols; and guide customers on charging and battery care.',
  "requirements" = 'ITI or diploma in automobile/electrical trade preferred.
Hands-on experience with two-wheeler EV battery, motor, or controller systems.
Understanding of high-voltage safety and lithium-ion handling.
Valid two-wheeler driving licence.
Willing to work at Civil Line, Lalitpur showroom & service bay.'
WHERE "title" IN ('Electric Vehicle Service Technician', 'Two-Wheeler EV Service Mechanic');
