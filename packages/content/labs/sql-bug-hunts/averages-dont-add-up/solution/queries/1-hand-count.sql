-- Task 1: prove it. Clemency's sum by hand, for each channel.
-- Return three columns, in this order:
--   channel
--   orders          how many orders came in on that channel
--   takings_pence   what those orders came to, every line of every order added up
-- One row per channel. Any order of rows.
--   node run.mjs queries/1-hand-count.sql

SELECT o.channel, COUNT(*) AS orders, SUM(t.total) AS takings_pence
FROM orders AS o
JOIN (SELECT order_id, SUM(packets * price_pence) AS total FROM order_lines GROUP BY order_id) AS t
  ON t.order_id = o.id
GROUP BY o.channel;
