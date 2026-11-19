-- Task: count orders for every driver.
-- Columns: driver (driver name), orders (orders with that driver_id, any status).
-- Every driver appears, with 0 when they have no orders.
-- Sort by orders, most first, then by driver A to Z.
-- Run it: node run.mjs queries/2-driver-load.sql

SELECT d.name AS driver, COUNT(o.id) AS orders
FROM drivers AS d
LEFT JOIN orders AS o ON o.driver_id = d.id
GROUP BY d.id, d.name
ORDER BY orders DESC, driver;
