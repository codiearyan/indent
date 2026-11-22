-- Task 1: this month's visits, with a number to ring about each one.
-- Return four columns, in this order:
--   visit_date
--   animal      the name of the animal that came in
--   last_name   its owner's last name
--   phone       its owner's phone number
-- One row for each visit on or after 2026-11-01. Any order of rows.
--   node run.mjs queries/1-november-calls.sql

SELECT v.visit_date, a.name AS animal, o.last_name, o.phone
FROM visits AS v
JOIN animals AS a ON v.animal_id = a.id
JOIN owners AS o ON a.owner_id = o.id
WHERE v.visit_date >= '2026-11-01';
