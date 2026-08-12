-- Assign role templates to existing job postings
UPDATE "JobPosting"
SET "roleTemplate" = 'sales_executive'
WHERE "title" ILIKE '%Sales Executive%' AND "roleTemplate" = 'general';

UPDATE "JobPosting"
SET "roleTemplate" = 'service_advisor'
WHERE "title" ILIKE '%Service Advisor%' AND "roleTemplate" = 'general';
