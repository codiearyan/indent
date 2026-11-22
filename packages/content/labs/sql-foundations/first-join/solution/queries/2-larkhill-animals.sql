-- Task 2: the animals whose owners live in Larkhill, for Mabel's home visits.
-- Return three columns, in this order:
--   animal   the animal's name
--   species
--   phone    the owner's phone number
-- One row for each animal whose owner lives in Larkhill. Any order of rows.
--   node run.mjs queries/2-larkhill-animals.sql

SELECT a.name AS animal, a.species, o.phone
FROM animals AS a
JOIN owners AS o ON a.owner_id = o.id
WHERE o.town = 'Larkhill';
