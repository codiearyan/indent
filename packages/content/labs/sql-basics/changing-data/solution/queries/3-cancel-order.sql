-- Task: cancel order 27 in one transaction (BEGIN; ... COMMIT;).
-- 1. Add each item's quantity in order 27 back to that product's stock.
-- 2. Set order 27's status to 'cancelled'.
-- Keep its order_items rows. Read ids and quantities from order_items; do not type them.
-- Run it: node run.mjs queries/3-cancel-order.sql

BEGIN;

UPDATE products
SET stock = stock + (
  SELECT quantity FROM order_items
  WHERE order_id = 27 AND product_id = products.id
)
WHERE id IN (SELECT product_id FROM order_items WHERE order_id = 27);

UPDATE orders
SET status = 'cancelled'
WHERE id = 27;

COMMIT;
