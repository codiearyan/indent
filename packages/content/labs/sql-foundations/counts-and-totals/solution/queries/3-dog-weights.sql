-- Task 3: the dogs and their average weight.
-- Return one row from the animals table with two columns, in this order:
--   dogs        how many dogs there are, weighed or not
--   average_kg  the average weight of the dogs that have been weighed, rounded to 2 decimal places
--   node run.mjs queries/3-dog-weights.sql

SELECT COUNT(*) AS dogs, ROUND(AVG(weight_kg), 2) AS average_kg
FROM animals
WHERE species = 'dog';
