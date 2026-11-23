-- Task 2: Moss, Agnes Dimmock's dog, came in today. Update his record:
--   breed       Collie cross
--   weight_kg   23.1
-- Change only Moss's row. Look up the row with a SELECT first, then write the UPDATE.
--   node run.mjs queries/2-moss-record.sql

SELECT id, name, breed, weight_kg FROM animals WHERE name = 'Moss' AND owner_id = 4;

UPDATE animals SET breed = 'Collie cross', weight_kg = 23.1 WHERE id = 6;
