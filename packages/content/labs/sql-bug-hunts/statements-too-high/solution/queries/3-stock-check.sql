-- Task 3: the stock check Dunstan prints every Monday. Nobody has complained about it yet.
-- It must return one row for every seed:
--   product    the seed's name
--   received   every packet that arrived from the growers, each counted once
--   sold       every packet in an order, each counted once
--   in_stock   received minus sold
-- 0 where there is nothing to count. Keep the four columns and their names. Any order of rows.
--   node run.mjs queries/3-stock-check.sql

SELECT p.name AS product,
  COALESCE(r.received, 0) AS received,
  COALESCE(s.sold, 0) AS sold,
  COALESCE(r.received, 0) - COALESCE(s.sold, 0) AS in_stock
FROM products AS p
LEFT JOIN (SELECT product_id, SUM(packets) AS received FROM restocks GROUP BY product_id) AS r
  ON r.product_id = p.id
LEFT JOIN (SELECT product_id, SUM(packets) AS sold FROM order_lines GROUP BY product_id) AS s
  ON s.product_id = p.id;
