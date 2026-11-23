-- Task 4: Ifan's visits with the animal he saw, newest first.
-- Return four columns, in this order:
--   visit_date
--   animal      the name of the animal that came in
--   species
--   reason
-- Only the visits Ifan Pryce saw, sorted by visit_date with the newest first.
--   node run.mjs queries/4-ifan-visits.sql

SELECT v.visit_date, a.name AS animal, a.species, v.reason
FROM visits AS v
JOIN animals AS a ON v.animal_id = a.id
WHERE v.vet = 'Ifan Pryce'
ORDER BY v.visit_date DESC;
