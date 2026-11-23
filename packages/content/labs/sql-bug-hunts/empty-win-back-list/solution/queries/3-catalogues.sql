-- Task 3: the catalogue print run, one row per town. Nobody has complained about it yet.
-- Perpetua's rule: every customer gets a catalogue unless they said no ('no' in post).
-- A customer nobody asked (NULL in post) gets one.
--   town         the town
--   catalogues   how many customers in that town get a catalogue
-- One row for each town where at least one customer gets one. Keep the two columns and their
-- names. Any order of rows.
--   node run.mjs queries/3-catalogues.sql

SELECT town, COUNT(*) AS catalogues
FROM customers
WHERE post IS NULL OR post <> 'no'
GROUP BY town;
