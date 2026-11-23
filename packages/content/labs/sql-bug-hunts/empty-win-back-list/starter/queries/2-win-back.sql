-- Task 2: fix the win-back list. It must return every customer who has not placed an order
-- on or after 2026-09-01, those who never ordered at all included:
--   customer   the customer's name
--   email      their email, NULL when they never gave one
-- Keep the two columns and their names. Any order of rows.
--   node run.mjs queries/2-win-back.sql

SELECT c.name AS customer, c.email
FROM customers AS c
WHERE c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.placed_at >= '2026-09-01');
