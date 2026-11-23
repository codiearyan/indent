-- Task 2: fix the average order. It must return one row per channel:
--   channel
--   average_pounds   what one order on that channel comes to on average, in pounds,
--                    rounded to two places with ROUND
-- Keep the two columns and their names. Any order of rows.
--   node run.mjs queries/2-averages.sql

SELECT o.channel, ROUND(AVG(t.total) / 100.0, 2) AS average_pounds
FROM orders AS o
JOIN (SELECT order_id, SUM(packets * price_pence) AS total FROM order_lines GROUP BY order_id) AS t
  ON t.order_id = o.id
GROUP BY o.channel;
