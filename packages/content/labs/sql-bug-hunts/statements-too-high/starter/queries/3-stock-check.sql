-- Task 3: the stock check Dunstan prints every Monday. Nobody has complained about it yet.
-- It must return one row for every seed:
--   product    the seed's name
--   received   every packet that arrived from the growers, each counted once
--   sold       every packet in an order, each counted once
--   in_stock   received minus sold
-- 0 where there is nothing to count. Keep the four columns and their names. Any order of rows.
--   node run.mjs queries/3-stock-check.sql

SELECT p.name AS product,
  COALESCE(SUM(r.packets), 0) AS received,
  COALESCE(SUM(l.packets), 0) AS sold,
  COALESCE(SUM(r.packets), 0) - COALESCE(SUM(l.packets), 0) AS in_stock
FROM products AS p
LEFT JOIN restocks AS r ON r.product_id = p.id
LEFT JOIN order_lines AS l ON l.product_id = p.id
GROUP BY p.id, p.name;
