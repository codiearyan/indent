-- Task 3: Dunstan's re-order list. Nobody has complained about it yet.
-- It must return one row for every seed:
--   product   the seed's name
--   packets   how many packets of it were in orders placed in November 2026, 0 when none
-- Keep the two columns and their names. Any order of rows.
--   node run.mjs queries/3-november-packets.sql

SELECT p.name AS product, COALESCE(SUM(l.packets), 0) AS packets
FROM products AS p
LEFT JOIN order_lines AS l ON l.product_id = p.id
LEFT JOIN orders AS o ON o.id = l.order_id
WHERE o.placed_at LIKE '2026-11%'
GROUP BY p.id, p.name;
