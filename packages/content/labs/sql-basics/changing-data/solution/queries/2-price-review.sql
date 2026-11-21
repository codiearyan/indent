-- Task: apply the price review.
-- 1. UPDATE: raise every 'bread' price by 5%, rounded to 2 decimals.
-- 2. DELETE: remove products with stock 0 that appear in no order_items row.
--    Out-of-stock products that were ordered before must stay.
-- Run it: node run.mjs queries/2-price-review.sql

UPDATE products
SET price = ROUND(price * 1.05, 2)
WHERE category = 'bread';

DELETE FROM products
WHERE stock = 0
  AND id NOT IN (SELECT product_id FROM order_items);
