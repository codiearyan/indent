-- Task 3: every visit, one vet at a time.
-- Return three columns from the visits table, in this order: vet, visit_date, reason.
-- Sorted by vet from A to Z, and within each vet by visit_date, newest first.
--   node run.mjs queries/3-visits-by-vet.sql

SELECT vet, visit_date, reason
FROM visits
ORDER BY vet, visit_date DESC;
