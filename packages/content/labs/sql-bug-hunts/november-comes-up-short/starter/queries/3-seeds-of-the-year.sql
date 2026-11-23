-- Task 3: the "seeds of the year" box on the website. Nobody has complained about it yet.
-- It must return the three seeds with the most packets in orders placed on or after 2026-01-01:
--   product   the seed's name
--   packets   how many packets
-- Most packets first. When two seeds have the same number of packets, the one whose name comes
-- first from A to Z comes first. Keep the two columns and their names.
--   node run.mjs queries/3-seeds-of-the-year.sql

SELECT p.name AS product, SUM(l.packets) AS packets
FROM products AS p
JOIN order_lines AS l ON l.product_id = p.id
JOIN orders AS o ON o.id = l.order_id
WHERE o.placed_at >= '2026-01-01'
GROUP BY p.id, p.name
ORDER BY packets DESC
LIMIT 3;
