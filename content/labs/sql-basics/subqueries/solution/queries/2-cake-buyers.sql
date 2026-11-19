-- Task: list the cafes that buy cake.
-- Columns: name, town.
-- Cafes with at least one delivered order containing a 'cake' product,
-- each cafe once. Use EXISTS. Row order does not matter.
-- Run it: node run.mjs queries/2-cake-buyers.sql

SELECT c.name, c.town
FROM cafes AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN products AS p ON p.id = oi.product_id
  WHERE o.cafe_id = c.id
    AND o.status = 'delivered'
    AND p.category = 'cake'
);
