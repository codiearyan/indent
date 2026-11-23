# November comes up short

## What you will be able to do

The averages mean what Clemency asked for now. The last ticket is about the edges of a report: where a month ends, and which rows make the cut when two of them tie. Both depend on details nobody looks at until a number is off by a little. By the end of this issue you will be able to:

- explain why a date range written with `BETWEEN` can miss the last day
- compare dates stored as text when some carry a time and some do not
- write a range that keeps a whole month, however its values are written
- break the ties in a sort, so a top three is the same on every run

## The ticket

> **Clemency:** November's card takings on our report are short of what the card company paid us. Not by much, a few pounds, but they should match to the penny. Cash matches. MF-18.

The report counts every payment with `paid_at BETWEEN '2026-11-01' AND '2026-11-30'` and adds them up per method.

## How it happens

There is no date type in this database. A date is text, and the foundations course showed why text written year, month, day compares in date order. Mallowfield writes `paid_at` three ways, though, depending on who types it: the website keeps the second (`2026-11-30 08:14:22`), Dunstan types phone payments to the minute (`2026-11-30 17:20`), and cash goes in the cash book with the date alone (`2026-11-30`).

Text compares letter by letter from the left. When one text is the start of another, the shorter one comes first. So `'2026-11-30 08:14:22'` comes after `'2026-11-30'`, and so does every other moment of the 30th. A range that ends at `'2026-11-30'` keeps the 30th only when it was written with the date alone. You can ask SQLite:

```sql
SELECT '2026-11-30 08:14:22' > '2026-11-30' AS later,
  '2026-11-30' BETWEEN '2026-11-01' AND '2026-11-30' AS date_alone,
  '2026-11-30 08:14:22' BETWEEN '2026-11-01' AND '2026-11-30' AS with_time;
```

```
later | date_alone | with_time
------+------------+----------
1     | 1          | 0
(1 row)
```

That is why cash matches and cards do not: every cash payment is written with the date alone, so the last day's cash is in, and the last day's card payments are out. The report was written when every payment was cash, and it was right then.

## How to mend it

The usual patches guess the last moment of the month. `BETWEEN '2026-11-01' AND '2026-11-30 23:59'` misses a payment at `23:59:47`, because seconds come after the minute. `BETWEEN '2026-11-01 00:00:00' AND '2026-11-30 23:59:59'` loses a cash payment written as `'2026-11-01'`, which is shorter than its lower limit and so comes before it. `BETWEEN '2026-11-01' AND '2026-12-01'` lets in a cash payment of 1 December, because `BETWEEN` keeps both of its limits.

The range that needs no guess starts at the first day and stops before the first day of the next month:

```sql
SELECT id, placed_at FROM orders WHERE placed_at >= '2026-11-28' AND placed_at < '2026-12-01';
```

```
id | placed_at
---+--------------------
29 | 2026-11-28
30 | 2026-11-29 16:40
31 | 2026-11-30 08:14:22
32 | 2026-11-30 17:20
33 | 2026-11-30 21:03:09
34 | 2026-11-30 23:59:47
(6 rows)
```

Every moment of the 30th, written any way, is less than `'2026-12-01'`, and nothing from December is. A pattern on the start of the text, as in `LIKE '2026-11%'`, keeps the same rows.

To prove what a range loses, look at the rows just past its limit, written each way they can be.

## Ties at the cut

The foundations course warned about every "top three": when the third and fourth rows have the same value, `LIMIT 3` keeps one of them, and nothing says which. Here are the five dearest seeds:

```sql
SELECT name, price_pence FROM products ORDER BY price_pence DESC LIMIT 5;
```

```
name                      | price_pence
--------------------------+------------
Sweet pea Midnight        | 310
Purple sprouting broccoli | 295
Scarlet runner bean       | 280
Black kale                | 270
White cosmos              | 260
(5 rows)
```

Winter purslane costs 260 as well, and it is not there. Nothing chose White cosmos; SQLite met it first. Load the same rows in another order, add an index, or let the table grow, and the other one can come back instead, with no new data at all. That is a bug in a box on a website, where each visitor may see something else.

The fix is to say how a tie is broken, by something that differs for every row, and to write it in `ORDER BY` after the first column. The person who owns the report decides what that is; the task tells you.

## Your work in this issue

Three files in `queries/`. In `1-left-out-payments.sql`, list the November payments the report leaves out. In `2-takings.sql`, fix the takings. In `3-seeds-of-the-year.sql`, fix the box on the website, which nobody has complained about yet. Run each with `node run.mjs` and the file's name. Check runs your query on the data you can see and on hidden data, and runs the seeds of the year once more on the same rows stored in another order.
