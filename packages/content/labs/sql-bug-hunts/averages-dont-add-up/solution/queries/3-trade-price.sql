-- Task 3: the trade price list. Nobody has complained about it yet.
-- A customer whose orders placed on or after 2026-01-01 come to more than £40 (4000 pence)
-- pays the trade price next year. It must return one row for each of them:
--   customer      the customer's name
--   spent_pence   what their orders placed on or after 2026-01-01 came to
-- Keep the two columns and their names. Any order of rows.
--   node run.mjs queries/3-trade-price.sql

SELECT c.name AS customer, SUM(l.packets * l.price_pence) AS spent_pence
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id
WHERE o.placed_at >= '2026-01-01'
GROUP BY c.id, c.name
HAVING SUM(l.packets * l.price_pence) > 4000;
