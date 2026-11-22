-- Task 2: the animals that have never had a visit.
-- Return two columns, in this order:
--   animal   the animal's name
--   species
-- One row for each animal that has no visit at all. Any order of rows.
--   node run.mjs queries/2-never-visited.sql

SELECT a.name AS animal, a.species
FROM animals AS a
LEFT JOIN visits AS v ON v.animal_id = a.id
WHERE v.id IS NULL;
