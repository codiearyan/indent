-- Task 2: what the treatments brought in.
-- Return one row from the treatments table with four columns, in this order:
--   total     the prices added up
--   average   the average price, rounded to 2 decimal places
--   cheapest  the lowest price
--   dearest   the highest price
-- Every treatment counts, the free ones too.
--   node run.mjs queries/2-takings.sql

SELECT SUM(price) AS total, ROUND(AVG(price), 2) AS average, MIN(price) AS cheapest, MAX(price) AS dearest
FROM treatments;
