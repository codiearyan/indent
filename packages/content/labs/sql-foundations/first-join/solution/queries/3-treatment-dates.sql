-- Task 3: every treatment with the date and the vet of its visit.
-- Return four columns, in this order:
--   visit_date  the date of the visit the treatment was given at
--   vet         the vet who saw that visit
--   treatment   the treatment's name
--   price
-- One row per treatment. Any order of rows.
--   node run.mjs queries/3-treatment-dates.sql

SELECT v.visit_date, v.vet, t.name AS treatment, t.price
FROM treatments AS t
JOIN visits AS v ON t.visit_id = v.id;
