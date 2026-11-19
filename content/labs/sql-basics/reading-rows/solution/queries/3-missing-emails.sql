-- Task: find the newest cafes with no email.
-- Columns: name, town, joined_on.
-- Only cafes whose contact_email is NULL, newest joined_on first, first 5 rows only.
-- Run it: node run.mjs queries/3-missing-emails.sql

SELECT name, town, joined_on
FROM cafes
WHERE contact_email IS NULL
ORDER BY joined_on DESC
LIMIT 5;
