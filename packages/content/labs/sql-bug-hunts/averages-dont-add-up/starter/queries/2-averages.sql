-- Task 2: fix the average order. It must return one row per channel:
--   channel
--   average_pounds   what one order on that channel comes to on average, in pounds,
--                    rounded to two places with ROUND
-- Keep the two columns and their names. Any order of rows.
--   node run.mjs queries/2-averages.sql

SELECT channel, ROUND(AVG(customer_average), 2) AS average_pounds
FROM (
  SELECT o.channel, o.customer_id,
    SUM(l.packets * l.price_pence) / COUNT(DISTINCT o.id) / 100 AS customer_average
  FROM orders AS o
  JOIN order_lines AS l ON l.order_id = o.id
  GROUP BY o.channel, o.customer_id
)
GROUP BY channel;
