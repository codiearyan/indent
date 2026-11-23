-- Task 3: every visit of an animal whose owner lives in Fernlea.
-- Return three columns, in this order:
--   visit_date
--   vet
--   reason
-- One row per visit. Any order of rows.
--   node run.mjs queries/3-fernlea-visits.sql

SELECT visit_date, vet, reason
FROM visits
WHERE animal_id IN (
  SELECT id FROM animals WHERE owner_id IN (SELECT id FROM owners WHERE town = 'Fernlea')
);
