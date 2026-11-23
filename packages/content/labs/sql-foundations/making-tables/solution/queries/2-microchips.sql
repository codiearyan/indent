-- Task 2: make the table microchips, for the chip number of each animal that has one.
--   id         the table's key, as in task 1
--   animal_id  a whole number, never empty: the id of the animal in animals
--   chip       text, never empty, and never the same on two rows
-- An animal can have two chips, when the first one stops working.
-- Write your CREATE TABLE here, above the rows that try it.

CREATE TABLE microchips (
  id INTEGER PRIMARY KEY,
  animal_id INTEGER NOT NULL,
  chip TEXT NOT NULL UNIQUE
);

-- These rows try your table. Run the file and read what happens to each one.
-- Check runs only your CREATE TABLE, and then tries rows of its own.
INSERT INTO microchips (animal_id, chip) VALUES (14, '826098100000014');
INSERT INTO microchips (animal_id, chip) VALUES (14, '826098100000015');
INSERT INTO microchips (animal_id, chip) VALUES (3, '826098100000014');
INSERT INTO microchips (animal_id) VALUES (3);
SELECT * FROM microchips;
--   node run.mjs queries/2-microchips.sql
