# Summaries

## What you will be able to do

Odile liked last week's lists, and now she wants numbers. How many orders are waiting? What does a typical cake cost us to sell? Which cafes order again and again? Lists of rows cannot answer these, but summaries can. By the end of this chapter you will be able to:

- count, add up and average a column with aggregate functions
- split rows into groups and get one summary line per group
- filter whole groups with HAVING
- explain when a filter belongs in WHERE and when it belongs in HAVING

## Aggregate functions

An aggregate function takes many rows and returns one value:

- `COUNT(*)` counts rows. `COUNT(column)` counts only the rows where that column is not NULL.
- `SUM(column)` adds the values up.
- `AVG(column)` returns the average.
- `MIN(column)` and `MAX(column)` return the smallest and largest value.

Without grouping, an aggregate summarizes the whole table, so `SELECT COUNT(*) FROM cafes;` returns a single row with a single number. You can wrap an aggregate in an ordinary function, such as `ROUND(AVG(price), 2)` to keep two decimals.

## GROUP BY

`GROUP BY column` sorts the rows into piles that share a value in that column, and every aggregate in the SELECT list is then worked out once per pile. The result has one row per group.

There is one rule to remember: every column you select must either be one you grouped by or sit inside an aggregate. Asking for `name` while grouping by `category` makes no sense, because a category has many names. SQLite will not always stop you, but it will pick an arbitrary name, which is a silent bug.

Here is a summary of the drivers' work, not part of any task:

```sql
SELECT driver_id, COUNT(*) AS trips, MIN(ordered_on) AS first_trip
FROM orders
WHERE driver_id IS NOT NULL
GROUP BY driver_id
HAVING COUNT(*) > 2
ORDER BY trips DESC;
```

## HAVING

`HAVING` is a filter for groups. It runs after the groups are formed, so it can use aggregates: `HAVING COUNT(*) > 2` keeps only the groups with more than two rows. WHERE cannot do this, because when WHERE runs, nothing has been counted yet.

## WHERE or HAVING?

A query with both runs in this order:

1. FROM picks the table.
2. WHERE removes single rows.
3. GROUP BY forms the groups.
4. HAVING removes whole groups.
5. SELECT works out the columns, and ORDER BY sorts what is left.

So ask what the condition is about. If it is about one row ("this order was delivered"), it belongs in WHERE. If it is about a group ("this cafe has at least three of them"), it belongs in HAVING. Mixing them up often gives a result that looks plausible: count every order and then keep cafes with three or more, and you thank a cafe whose three orders were all cancelled. The numbers are right for the wrong question.

## Sorting summaries

ORDER BY works on summaries too, and it can use the alias you gave an aggregate, like `trips` above. When two groups tie, add a second sort column so the order is always the same. A report that shuffles itself between runs is hard to trust.

## How your work is checked

As before, the check runs your file on the shipped data and on a hidden dataset, and compares column names and values. Averages are compared after rounding, so round where the task says to. If the shipped data passes and the hidden data fails, look for a number you copied from the visible rows.
