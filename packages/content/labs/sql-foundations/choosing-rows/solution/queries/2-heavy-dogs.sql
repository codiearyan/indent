-- Task 2: dogs for the big scales.
-- Return two columns from the animals table, in this order: name, weight_kg.
-- Only dogs that weigh more than 25 kg. Any order of rows.
--   node run.mjs queries/2-heavy-dogs.sql

SELECT name, weight_kg
FROM animals
WHERE species = 'dog' AND weight_kg > 25;
