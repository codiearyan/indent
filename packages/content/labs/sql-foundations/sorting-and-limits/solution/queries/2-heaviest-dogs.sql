-- Task 2: the dogs, heaviest first.
-- Return two columns from the animals table, in this order: name, weight_kg.
-- Only dogs, from the heaviest to the lightest. A dog nobody has weighed goes at the very end.
--   node run.mjs queries/2-heaviest-dogs.sql

SELECT name, weight_kg
FROM animals
WHERE species = 'dog'
ORDER BY weight_kg DESC;
