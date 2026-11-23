-- Task 3: Ifan and Mabel each look at their own visits from a date on, such as
--   SELECT visit_date, reason FROM visits WHERE vet = 'Ifan Pryce' AND visit_date >= '2026-11-01';
-- Make one index that SQLite uses for both parts of that search: the vet and the date.
-- Write your CREATE INDEX here, and read the plan with EXPLAIN QUERY PLAN.

CREATE INDEX visits_by_vet_and_date ON visits (vet, visit_date);

EXPLAIN QUERY PLAN SELECT visit_date, reason FROM visits WHERE vet = 'Ifan Pryce' AND visit_date >= '2026-11-01';
--   node run.mjs queries/3-vet-and-date.sql
