-- Task 4: how many dogs each owner has, the owners with none included.
-- Return three columns, in this order:
--   first_name
--   last_name
--   dogs        how many of the owner's animals are dogs, 0 when none
-- One row per owner, every owner included. Any order of rows.
--   node run.mjs queries/4-dog-counts.sql

SELECT o.first_name, o.last_name, COUNT(a.id) AS dogs
FROM owners AS o
LEFT JOIN animals AS a ON a.owner_id = o.id AND a.species = 'dog'
GROUP BY o.id, o.first_name, o.last_name;
