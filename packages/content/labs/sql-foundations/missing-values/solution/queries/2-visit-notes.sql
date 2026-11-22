-- Task 2: visits with notes.
-- Return three columns from the visits table, in this order: visit_date, vet, notes.
-- Only visits where the vet wrote notes. Any order of rows.
--   node run.mjs queries/2-visit-notes.sql

SELECT visit_date, vet, notes
FROM visits
WHERE notes IS NOT NULL;
