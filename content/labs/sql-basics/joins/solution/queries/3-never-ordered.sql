-- Task: find products nobody orders.
-- Columns: name, category.
-- Products that appear in no order_items row. Row order does not matter.
-- Run it: node run.mjs queries/3-never-ordered.sql

SELECT p.name, p.category
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
WHERE oi.product_id IS NULL;
