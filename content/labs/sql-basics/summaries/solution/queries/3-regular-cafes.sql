-- Task: find the regular cafes.
-- Columns: cafe_id, delivered (how many delivered orders the cafe has).
-- Only cafes with 3 or more delivered orders; other statuses do not count.
-- Sort by delivered, most first, then by cafe_id.
-- Run it: node run.mjs queries/3-regular-cafes.sql

SELECT cafe_id, COUNT(*) AS delivered
FROM orders
WHERE status = 'delivered'
GROUP BY cafe_id
HAVING COUNT(*) >= 3
ORDER BY delivered DESC, cafe_id;
