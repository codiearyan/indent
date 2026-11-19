-- Task: pick products for the counter display.
-- Columns: name, category, price.
-- Products in category 'pastry' or 'cake' priced under 3.00,
-- plus every product with 'rye' anywhere in its name. Use IN and LIKE.
-- Row order does not matter.
-- Run it: node run.mjs queries/2-shelf-picks.sql

SELECT name, category, price
FROM products
WHERE (category IN ('pastry', 'cake') AND price < 3.00)
   OR name LIKE '%rye%';
