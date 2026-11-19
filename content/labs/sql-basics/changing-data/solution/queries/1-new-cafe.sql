-- Task: sign up a new cafe.
-- 1. Insert the cafe 'The Lantern Room', town 'Wyndham Cross',
--    email 'hello@lanternroom.example', joined on '2026-11-19'.
-- 2. Insert a 'pending' order for it on '2026-11-19' with no driver (NULL).
-- Type no ids: let the database choose them and find the cafe id with a subquery.
-- Run it: node run.mjs queries/1-new-cafe.sql

INSERT INTO cafes (name, town, contact_email, joined_on)
VALUES ('The Lantern Room', 'Wyndham Cross', 'hello@lanternroom.example', '2026-11-19');

INSERT INTO orders (cafe_id, driver_id, ordered_on, status)
VALUES ((SELECT id FROM cafes WHERE name = 'The Lantern Room'), NULL, '2026-11-19', 'pending');
