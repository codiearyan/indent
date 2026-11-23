-- Task 1: every owner who has at least one dog, each owner once.
-- Return three columns, in this order:
--   first_name
--   last_name
--   phone
-- One row per owner, however many dogs they have. Any order of rows.
--   node run.mjs queries/1-dog-owners.sql

SELECT first_name, last_name, phone
FROM owners
WHERE id IN (SELECT owner_id FROM animals WHERE species = 'dog');
