-- Task: list the cafes in Port Ellery.
-- Columns: name, and contact_email renamed to email.
-- Only cafes whose town is 'Port Ellery', sorted by name A to Z.
-- Run it: node run.mjs queries/1-port-ellery-cafes.sql

SELECT name, contact_email AS email
FROM cafes
WHERE town = 'Port Ellery'
ORDER BY name;
