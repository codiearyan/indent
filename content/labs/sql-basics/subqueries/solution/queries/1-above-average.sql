-- Task: spot the dear products in each category.
-- Columns: name, category, price.
-- Products priced above the average price of their own category.
-- Sort by category A to Z, then price highest first. No typed-in numbers.
-- Run it: node run.mjs queries/1-above-average.sql

SELECT p.name, p.category, p.price
FROM products AS p
WHERE p.price > (
  SELECT AVG(price) FROM products WHERE category = p.category
)
ORDER BY p.category, p.price DESC;
