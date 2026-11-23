-- Task 4: make the table appointments, for visits booked ahead.
--   id         the table's key, as in task 1
--   animal_id  a whole number, never empty, that points at the id of a row in animals
--   starts     text, never empty: YYYY-MM-DD HH:MM
--   vet        text, never empty
-- An appointment for an animal that is not in animals is refused, and an animal with an
-- appointment cannot be removed from animals.
-- Write your CREATE TABLE here, above the rows that try it.



-- These rows try your table. Run the file and read what happens to each one.
-- Check runs only your CREATE TABLE, and then tries rows of its own.
INSERT INTO appointments (animal_id, starts, vet) VALUES (22, '2026-11-27 09:30', 'Mabel Tranter');
INSERT INTO appointments (animal_id, starts, vet) VALUES (99, '2026-11-27 10:00', 'Ifan Pryce');
DELETE FROM animals WHERE id = 22;
SELECT * FROM appointments;
--   node run.mjs queries/4-appointments.sql
