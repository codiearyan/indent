-- Task 3: the kinds of treatment, by what they brought in.
-- Return three columns from the treatments table, in this order:
--   kind
--   treatments  how many treatments of that kind there are
--   takings     their prices added up
-- One row per kind, sorted by takings with the biggest first.
--   node run.mjs queries/3-takings-per-kind.sql

SELECT kind, COUNT(*) AS treatments, SUM(price) AS takings
FROM treatments
GROUP BY kind
ORDER BY takings DESC;
