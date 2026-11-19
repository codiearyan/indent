-- Task: find the cafes that spend above average.
-- Spend = sum of quantity * price over items in the cafe's delivered orders.
-- Columns: cafe (name), spend (rounded to 2 decimals).
-- Only cafes whose spend is above the average spend of cafes with delivered orders.
-- Sort by spend, highest first. Use WITH for the per-cafe spend; round only at the end.
-- Run it: node run.mjs queries/3-big-spenders.sql

WITH spend AS (
  SELECT o.cafe_id, SUM(oi.quantity * p.price) AS total
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN products AS p ON p.id = oi.product_id
  WHERE o.status = 'delivered'
  GROUP BY o.cafe_id
)
SELECT c.name AS cafe, ROUND(s.total, 2) AS spend
FROM spend AS s
JOIN cafes AS c ON c.id = s.cafe_id
WHERE s.total > (SELECT AVG(total) FROM spend)
ORDER BY spend DESC;
