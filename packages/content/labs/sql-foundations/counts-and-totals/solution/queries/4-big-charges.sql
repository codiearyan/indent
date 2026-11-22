-- Task 4: the charges over 250 pounds.
-- Return one row from the treatments table with two columns, in this order:
--   charges  how many treatments cost more than 250
--   total    their prices added up, and 0 when there are none
--   node run.mjs queries/4-big-charges.sql

SELECT COUNT(*) AS charges, COALESCE(SUM(price), 0) AS total
FROM treatments
WHERE price > 250;
