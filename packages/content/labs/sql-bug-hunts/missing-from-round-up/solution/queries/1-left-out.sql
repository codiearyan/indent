-- Task 1: prove it. List every customer the round-up in 2-round-up.sql should show and
-- leaves out: the customers with no order placed on or after 2026-01-01, those who never
-- ordered at all included.
-- Return two columns, in this order:
--   id
--   customer   the customer's name
-- Any order of rows.
--   node run.mjs queries/1-left-out.sql

SELECT c.id, c.name AS customer
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.placed_at >= '2026-01-01'
WHERE o.id IS NULL;
