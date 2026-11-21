# Queries inside queries

## What you will be able to do

Some of the team's questions have a question hidden inside them. "Which products are dear?" really means "which products cost more than the average, and what is the average?" You could run two queries and copy a number from one into the other, but the number goes stale the moment a price changes. By the end of this issue you will be able to:

- use a subquery in WHERE to compare against a value worked out on the fly
- write a correlated subquery that runs once per outer row
- test whether related rows exist with EXISTS
- use a subquery in FROM, and name it with WITH to break a problem into steps

## A subquery in WHERE

A subquery is a full SELECT in parentheses. If it returns a single value, you can use it anywhere you would write a number. In `WHERE ordered_on > (SELECT MIN(ordered_on) FROM orders WHERE status = 'cancelled')`, SQLite runs the inner query, gets one date, and uses it in the outer comparison. A subquery that returns a whole column works with IN: `WHERE cafe_id IN (SELECT id FROM cafes WHERE town = 'Saltmarsh')`.

## Correlated subqueries

A subquery can refer to the row the outer query is looking at. Give the outer table an alias, then use it inside: `(SELECT COUNT(*) FROM orders AS o WHERE o.cafe_id = c.id)` counts the orders of whichever cafe `c` is on right now. This is a correlated subquery. Think of it as a small question asked again for every outer row.

## EXISTS

Often you only care whether a related row exists, not how many there are. `EXISTS (subquery)` is true when the subquery returns at least one row, and `NOT EXISTS` is true when it returns none. It is nearly always correlated, because "does this cafe have a pending order?" needs to know which cafe.

EXISTS has a quiet advantage over a join: it never repeats the outer row. Joining cafes to their orders gives a cafe once per order, and you would need DISTINCT or GROUP BY to undo that. EXISTS asks a yes or no question, so each cafe appears once.

## A subquery in FROM

A SELECT returns a table, so you can query its result like a table. Put it in FROM, in parentheses, with an alias: `FROM (SELECT order_id, COUNT(*) AS items FROM order_items GROUP BY order_id) AS per_order`. This is how you summarize a summary: count items per order first, then work with those counts.

## Naming steps with WITH

Nested parentheses get hard to read fast. A common table expression gives a subquery a name before the main query starts. This one finds the orders with more items than the typical order:

```sql
WITH per_order AS (
  SELECT order_id, COUNT(*) AS items FROM order_items GROUP BY order_id
)
SELECT order_id, items
FROM per_order
WHERE items > (SELECT AVG(items) FROM per_order)
ORDER BY items DESC, order_id;
```

Each name works like a table for the rest of the statement, and you can use it more than once, for example both in FROM and inside a subquery in WHERE. Add several steps by separating them with commas. Writing a hard query as a chain of small named steps, and running each step on its own as you go, is the habit that makes big queries manageable.

## How your work is checked

The hidden dataset in this issue has different prices and orders, so averages and totals change. A query that types in a number it saw in the shipped data will match there and fail on the hidden data. Let the query work every value out.
