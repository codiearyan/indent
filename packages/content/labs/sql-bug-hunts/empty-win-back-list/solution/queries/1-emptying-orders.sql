-- Task 1: prove it. List the orders that empty the win-back list: every order that the query
-- in brackets in 2-win-back.sql reads (placed on or after 2026-09-01) and that has no customer.
-- Return three columns, in this order:
--   id
--   placed_at
--   channel
-- Any order of rows.
--   node run.mjs queries/1-emptying-orders.sql

SELECT id, placed_at, channel
FROM orders
WHERE placed_at >= '2026-09-01' AND customer_id IS NULL;
