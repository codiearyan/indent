-- Task 1: prove it. List every order that the statement query's join (customers, orders,
-- order_lines and payments, as in 2-statements.sql) turns into more than one row.
-- Return three columns, in this order:
--   order_id
--   customer   the customer's name
--   copies     how many rows of that join the order fills
-- Only orders that fill more than one row. Any order of rows.
--   node run.mjs queries/1-counted-twice.sql

SELECT o.id AS order_id, c.name AS customer, COUNT(*) AS copies
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id
JOIN payments AS p ON p.order_id = o.id
GROUP BY o.id, c.name
HAVING COUNT(*) > 1;
