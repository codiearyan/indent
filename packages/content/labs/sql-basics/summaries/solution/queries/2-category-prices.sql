-- Task: summarize prices by category.
-- Columns: category, products (count), cheapest (lowest price), dearest (highest price),
-- avg_price (average price rounded to 2 decimals). One row per category, sorted by category.
-- Run it: node run.mjs queries/2-category-prices.sql

SELECT
  category,
  COUNT(*) AS products,
  MIN(price) AS cheapest,
  MAX(price) AS dearest,
  ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY category
ORDER BY category;
