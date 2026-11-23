-- Task 2: fix the round-up. It must return one row for every customer:
--   customer      the customer's name
--   spent_pence   what their orders placed on or after 2026-01-01 came to, 0 when none
-- Keep the two columns and their names. Any order of rows.
--   node run.mjs queries/2-round-up.sql

SELECT c.name AS customer, COALESCE(SUM(l.packets * l.price_pence), 0) AS spent_pence
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.placed_at >= '2026-01-01'
LEFT JOIN order_lines AS l ON l.order_id = o.id
GROUP BY c.id, c.name;
