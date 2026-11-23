-- Task 1: Winnie looks up the visits of one day many times a day, and today SQLite reads every
-- visit to find them. Make an index so that a search for the visits of one date, or of a range
-- of dates, uses it instead.
-- First run this file to read the plan as it is now. Then write your CREATE INDEX above the
-- plan and run the file again.

CREATE INDEX visits_by_date ON visits (visit_date);

EXPLAIN QUERY PLAN SELECT visit_date, vet, reason FROM visits WHERE visit_date = '2026-11-20';
--   node run.mjs queries/1-visit-dates.sql
