-- Task 2: fix the statements. This is the query that prints each customer's statement.
-- It must return, for every customer who has placed an order:
--   customer     the customer's name
--   packets      every packet in their orders, each counted once
--   paid_pence   every payment of theirs, each counted once
-- Keep the three columns and their names. Any order of rows.
--   node run.mjs queries/2-statements.sql

SELECT c.name AS customer, bought.packets, paid.paid_pence
FROM customers AS c
JOIN (
  SELECT o.customer_id, SUM(l.packets) AS packets
  FROM orders AS o
  JOIN order_lines AS l ON l.order_id = o.id
  GROUP BY o.customer_id
) AS bought ON bought.customer_id = c.id
JOIN (
  SELECT o.customer_id, SUM(p.amount_pence) AS paid_pence
  FROM orders AS o
  JOIN payments AS p ON p.order_id = o.id
  GROUP BY o.customer_id
) AS paid ON paid.customer_id = c.id;
