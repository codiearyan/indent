-- Task 3: the visits nothing was charged for.
-- Return three columns from the visits, in this order:
--   visit_date
--   vet
--   reason
-- One row for each visit that has no treatment at all. A visit with a treatment that
-- cost 0 was charged, so it is not one of them. Any order of rows.
--   node run.mjs queries/3-free-visits.sql

SELECT v.visit_date, v.vet, v.reason
FROM visits AS v
LEFT JOIN treatments AS t ON t.visit_id = v.id
WHERE t.id IS NULL;
