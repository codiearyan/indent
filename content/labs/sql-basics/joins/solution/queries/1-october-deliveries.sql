-- Task: build the October delivery log.
-- Columns: order_id, cafe (cafe name), driver (driver name), ordered_on.
-- Only delivered orders with ordered_on from 2026-10-01 to 2026-10-31.
-- Sort by ordered_on, then order_id. Join orders, cafes and drivers.
-- Run it: node run.mjs queries/1-october-deliveries.sql

SELECT o.id AS order_id, c.name AS cafe, d.name AS driver, o.ordered_on
FROM orders AS o
JOIN cafes AS c ON c.id = o.cafe_id
JOIN drivers AS d ON d.id = o.driver_id
WHERE o.status = 'delivered'
  AND o.ordered_on BETWEEN '2026-10-01' AND '2026-10-31'
ORDER BY o.ordered_on, o.id;
