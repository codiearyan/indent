-- Task 1: owners with no email.
-- Return three columns from the owners table, in this order: first_name, last_name, phone.
-- Only owners who never gave an email. Any order of rows.
--   node run.mjs queries/1-no-email.sql

SELECT first_name, last_name, phone
FROM owners
WHERE email IS NULL;
