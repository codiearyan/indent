# Joins

## What you will be able to do

Odile's questions now cross tables. An order row says `cafe_id = 9` and `driver_id = 3`, which means nothing to a cafe owner on the phone. The names live in other tables. By the end of this issue you will be able to:

- combine two or more tables with INNER JOIN
- keep rows that have no match with LEFT JOIN
- find rows that have no match at all
- choose the right join by asking which rows must survive

## Why the data is split up

Look at `schema.sql` again. An order does not store the cafe's name and town. It stores `cafe_id`, which points at one row in `cafes`. This is on purpose: if a cafe changes its name, the bakehouse changes one row, not hundreds of orders. A column that points at another table's id is called a foreign key. The price of that tidiness is that answers often need joins.

## INNER JOIN

A join puts rows from two tables side by side wherever a condition holds:

```sql
SELECT oi.order_id, p.name AS product, oi.quantity
FROM order_items AS oi
JOIN products AS p ON p.id = oi.product_id
WHERE p.category = 'bread'
ORDER BY oi.order_id;
```

`JOIN` on its own means INNER JOIN. For every order item, SQLite finds the product whose `id` equals the item's `product_id` and makes one combined row. Items without a matching product would be dropped.

The short names after `AS` are table aliases. They keep queries readable, and they are required when two tables share a column name: `cafes` and `drivers` both have `name`, so you must say `c.name` or `d.name`.

## Joining three tables

Joins chain. Start from the table that holds one row per thing you want to list, then add a `JOIN ... ON ...` for each table you need a column from. Every join needs its own ON condition. A missing or wrong condition pairs every row with every other row, and a ten-row answer suddenly has hundreds of rows. If the row count jumps, check your ON clauses first.

## LEFT JOIN

Sometimes the rows without a match matter most. `LEFT JOIN` keeps every row from the table on the left. When there is no match on the right, it still returns the row, with NULL in every right-hand column.

That changes how you count. `COUNT(*)` counts rows, and the NULL-filled row is still a row, so a driver with no orders would count as 1. `COUNT(o.id)` counts only non-NULL values, so the same driver correctly counts as 0.

Be careful with WHERE after a LEFT JOIN. A condition on a right-hand column, like `o.status = 'pending'`, throws away the NULL rows again and quietly turns your LEFT JOIN back into an inner one. Put such conditions in the ON clause when you want to keep the unmatched rows.

## Finding rows with no match

Combine the two ideas to find what is missing. LEFT JOIN, then keep only the rows where the right side is NULL:

- a cafe that never ordered has no row in `orders`
- a driver never assigned has no order pointing at them

Test a column that can never be NULL in a real matched row, such as the right table's id or the joined key. Then a NULL can only mean "no match".

## How your work is checked

The check runs your file on the shipped data and on a hidden dataset, and compares column names and values. Join mistakes usually show up as a wrong row count, so the message will tell you if you have too many rows (a loose ON condition) or too few (a join that dropped rows you needed).
