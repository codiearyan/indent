# Totals per group

## What you will be able to do

In the last issue every count and total squeezed the whole table into one row. That answers "how many animals?", but not "how many of each?". For that you need one count per species, one total per kind, one bill per visit. In this issue you split the rows into groups and get a figure for each group, then choose and sort the groups by those figures. By the end of it you will be able to:

- get one row per group with `GROUP BY`, and group by two columns at once
- keep only some groups with `HAVING`, and say when `WHERE` is the right tool instead
- sort groups by their totals
- read the error SQLite gives when a count lands in the wrong place, and spot the mistake it gives no error for

## The request from Rosamund

> **Rosamund:** Winnie wants a count of the animals of each species for the leaflet order, and Ifan the same split by breed. I want to see which kinds of treatment bring in the most, biggest first. And I would like to offer to spread the payment of any bill over £100, so I need those visits. A bill can get there with one big treatment or with a few small ones.

## One row per group

`GROUP BY` goes after `FROM` and any `WHERE`, and names the column whose values make the groups. Rows with the same value land in the same group, and every aggregate in the query runs once per group:

```sql
SELECT vet, COUNT(*) AS visits
FROM visits
GROUP BY vet;
```

That gives one row for Ifan with 9 visits and one for Mabel with 7. The column you group by is the label of each row, so it belongs in the column list. Rows whose grouped column is empty do not vanish: all the `NULL` values form one group of their own.

`GROUP BY` takes more than one column. With `GROUP BY vet, reason`, rows go in the same group only when they match on both, so you get one row for each vet and reason that occur together: Ifan's booster vaccines in one row, Mabel's ear infection in another.

## The mistake with no error

Every column in the list must be one you grouped by or one inside an aggregate. Look at this:

```sql
SELECT vet, reason, COUNT(*) AS visits
FROM visits
GROUP BY vet;
```

Each group is all of one vet's visits, with many reasons, so `reason` has no single value to show. Most databases stop here with an error. SQLite runs it, and shows the reason from one of the visits in each group, which looks like an answer and is not one. So when SQLite gives no error, check every plain column yourself: if it is not after `GROUP BY`, either add it there or take it out.

## WHERE or HAVING

A query with groups has two places for a condition, and they test different things. `WHERE` tests single rows, before they are grouped. `HAVING` comes after `GROUP BY` and tests whole groups, so it can use their counts and totals:

```sql
SELECT vet, COUNT(*) AS visits
FROM visits
WHERE visit_date >= '2026-10-01'
GROUP BY vet
HAVING COUNT(*) > 4;
```

Read it in the order SQLite works: take the visits since October, group them by vet, count each group, then keep the vets with more than four. Both conditions are in one query, each doing its own job.

A count or a total does not exist yet while `WHERE` runs, so `WHERE COUNT(*) > 4` stops with `misuse of aggregate: COUNT()`. When you see that error, the condition belongs in `HAVING`. The opposite slip gives no error: a condition on single rows in `WHERE` when you meant one on the group. "Treatments over £100" and "visits whose treatments add up to over £100" are different questions, and only the second needs `HAVING`.

## Sorting groups

`ORDER BY` comes after `HAVING` and can sort by a total, either by the aggregate itself or by the name you gave it:

```sql
SELECT vet, COUNT(*) AS visits
FROM visits
GROUP BY vet
ORDER BY visits DESC;
```

The full order of the parts is now `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`. Put one out of place and SQLite answers with a `syntax error` near the word it did not expect.

## Your work in this issue

Four files in `queries/`, one task each. Run your query with `node run.mjs` and the file's name after every change, and count one group by hand in `seed.sql` to make sure its figure is right. Then press Check. It compares the columns and the rows on the data you can see and on hidden data, which has other species, other kinds and a bill right on the limit. Task 3 asks for an order, and Check compares it there.
