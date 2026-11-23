-- Task 1: each animal with its owner.
-- Return three columns, in this order:
--   animal      the animal's name, from the animals table
--   first_name  its owner's first name, from the owners table
--   last_name   its owner's last name
-- One row per animal. Any order of rows.
--   node run.mjs queries/1-owner-names.sql

SELECT animals.name AS animal, owners.first_name, owners.last_name
FROM animals
JOIN owners ON animals.owner_id = owners.id;
