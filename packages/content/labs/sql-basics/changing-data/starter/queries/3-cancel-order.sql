-- Task: cancel order 27 in one transaction (BEGIN; ... COMMIT;).
-- 1. Add each item's quantity in order 27 back to that product's stock.
-- 2. Set order 27's status to 'cancelled'.
-- Keep its order_items rows. Read ids and quantities from order_items; do not type them.
-- Run it: node run.mjs queries/3-cancel-order.sql

