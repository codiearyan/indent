-- Task 3: October's visits.
-- Return three columns from the visits table, in this order: visit_date, vet, reason.
-- Only visits from 1 October 2026 to 31 October 2026, both days included.
-- Any order of rows.
--   node run.mjs queries/3-october-visits.sql

SELECT visit_date, vet, reason
FROM visits
WHERE visit_date BETWEEN '2026-10-01' AND '2026-10-31';
