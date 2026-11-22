-- Task 3: owners for the Thursday home visits.
-- Return three columns from the owners table, in this order: first_name, last_name, town.
-- Only owners who do not live in Hollybank. Any order of rows.
--   node run.mjs queries/3-out-of-town.sql

SELECT first_name, last_name, town
FROM owners
WHERE town <> 'Hollybank';
