-- The queries the practice runs every day. Task 4 asks which index none of them uses.
-- Put EXPLAIN QUERY PLAN in front of one, in a file of queries/, to see how SQLite runs it.

-- The front desk: what a visit was charged.
SELECT name, price FROM treatments WHERE visit_id = 12;

-- Winnie's round of calls: the owners in one town.
SELECT first_name, last_name, phone FROM owners WHERE town = 'Brackenford';

-- Ifan: the visits whose notes say to rest.
SELECT visit_date, notes FROM visits WHERE notes LIKE '%rest%';
