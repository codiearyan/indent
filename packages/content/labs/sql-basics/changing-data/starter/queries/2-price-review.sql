-- Task: apply the price review.
-- 1. UPDATE: raise every 'bread' price by 5%, rounded to 2 decimals.
-- 2. DELETE: remove products with stock 0 that appear in no order_items row.
--    Out-of-stock products that were ordered before must stay.
-- Run it: node run.mjs queries/2-price-review.sql

