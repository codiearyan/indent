-- Task 4: the three oldest animals.
-- Return three columns from the animals table, in this order: name, species, born.
-- The three animals born earliest, oldest first. Leave out animals whose birthday nobody knows.
-- Two animals born on the same day go in order of name, from A to Z.
--   node run.mjs queries/4-oldest-three.sql

SELECT name, species, born
FROM animals
WHERE born IS NOT NULL
ORDER BY born, name
LIMIT 3;
