-- Task 1: make the table vets. Today each visit has its vet's name typed in by hand.
--   id     the table's key: a whole number that fills itself in when a row comes without one
--   name   text, never empty
--   phone  text, may be empty
-- Write your CREATE TABLE here, above the rows that try it.

CREATE TABLE vets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT
);

-- These rows try your table. Run the file and read what happens to each one.
-- Check runs only your CREATE TABLE, and then tries rows of its own.
INSERT INTO vets (name, phone) VALUES ('Ifan Pryce', '01632960301');
INSERT INTO vets (name) VALUES ('Mabel Tranter');
INSERT INTO vets (phone) VALUES ('01632960303');
SELECT * FROM vets;
--   node run.mjs queries/1-vets.sql
