-- Task 4: every index costs. It takes room, and each INSERT, UPDATE and DELETE on its table has
-- to change it too. schema.sql has three indexes. Read the plan of each query in
-- practice-queries.sql, find the index that none of them uses, and remove that one.
-- Write your EXPLAIN QUERY PLAN lines and your DROP INDEX here.

EXPLAIN QUERY PLAN SELECT name, price FROM treatments WHERE visit_id = 12;
EXPLAIN QUERY PLAN SELECT first_name, last_name, phone FROM owners WHERE town = 'Brackenford';
EXPLAIN QUERY PLAN SELECT visit_date, notes FROM visits WHERE notes LIKE '%rest%';

DROP INDEX visits_by_notes;
--   node run.mjs queries/4-unused-index.sql
