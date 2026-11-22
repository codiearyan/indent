-- Task 2: the front desk phone list.
-- Return three columns from the owners table, in this order:
--   first_name
--   surname, which is the last_name column under a new name
--   phone
-- Every owner, in any order of rows.
--   node run.mjs queries/2-phone-list.sql

SELECT first_name, last_name AS surname, phone
FROM owners;
