-- Task 3: each animal's visits and what they came to.
-- Return three columns, in this order:
--   animal  the animal's name
--   visits  how many visits it has had, each counted once
--   spent   the prices of all the treatments of those visits added up, 0 when nothing was charged
-- One row for each animal that has had at least one visit. Two animals can share a name and
-- are still two rows. Any order of rows.
--   node run.mjs queries/3-spent-per-animal.sql

SELECT a.name AS animal, COUNT(DISTINCT v.id) AS visits, COALESCE(SUM(t.price), 0) AS spent
FROM animals AS a
JOIN visits AS v ON v.animal_id = a.id
LEFT JOIN treatments AS t ON t.visit_id = v.id
GROUP BY a.id, a.name;
