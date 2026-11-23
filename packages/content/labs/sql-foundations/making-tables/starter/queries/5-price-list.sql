-- Task 5: make the table price_list, the practice's prices, with types that are rules.
--   id     the table's key, as in task 1
--   name   text, never empty, and never the same on two rows
--   price  a number that may have pence, never empty, in pounds
-- A price that is not a number is refused.
-- Write your CREATE TABLE here, above the rows that try it.



-- These rows try your table. Run the file and read what happens to each one.
-- Check runs only your CREATE TABLE, and then tries rows of its own.
INSERT INTO price_list (name, price) VALUES ('Nail trim', 12);
INSERT INTO price_list (name, price) VALUES ('Booster vaccine', 'fifty-two');
INSERT INTO price_list (name, price) VALUES ('Nail trim', 14.5);
SELECT * FROM price_list;
--   node run.mjs queries/5-price-list.sql
