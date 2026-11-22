-- Task 2: how many animals each owner has, the owners with none included.
-- Return three columns, in this order:
--   first_name
--   last_name
--   animals     how many animals the owner has, 0 when none
-- One row per owner. Two owners can share a name and are still two rows. Any order of rows.
--   node run.mjs queries/2-animals-per-owner.sql

SELECT o.first_name, o.last_name, COUNT(a.id) AS animals
FROM owners AS o
LEFT JOIN animals AS a ON a.owner_id = o.id
GROUP BY o.id, o.first_name, o.last_name;
