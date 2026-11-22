-- Task 1: the phone book, by surname.
-- Return three columns from the owners table, in this order: last_name, first_name, phone.
-- Every owner, sorted by last_name from A to Z.
--   node run.mjs queries/1-phone-book.sql

SELECT last_name, first_name, phone
FROM owners
ORDER BY last_name;
