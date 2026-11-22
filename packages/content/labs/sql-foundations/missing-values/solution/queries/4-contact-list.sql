-- Task 4: one way to reach every owner.
-- Return three columns from the owners table, in this order:
--   first_name
--   last_name
--   contact, the owner's email, or their phone when they have no email
-- Every owner, in any order of rows.
--   node run.mjs queries/4-contact-list.sql

SELECT first_name, last_name, COALESCE(email, phone) AS contact
FROM owners;
