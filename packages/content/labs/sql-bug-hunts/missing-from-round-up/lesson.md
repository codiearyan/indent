# Customers missing from the round-up

## What you will be able to do

The win-back list has its names back. This ticket loses people too, through a different door: a `LEFT JOIN` that was written to keep every customer, and something after it that quietly takes them away again. By the end of this issue you will be able to:

- explain how a condition in `WHERE` turns a `LEFT JOIN` back into a plain join
- list the rows such a report should show and does not
- move a condition to where it chooses partners instead of rows
- spot the case where moving it into the last `ON` is still not enough

## The ticket

Dunstan writes a postcard to every customer at the end of the year. The ones who spent nothing this year get a free packet with theirs, to tempt them back.

> **Dunstan:** The round-up is meant to have every customer on it, with 0 for the ones who bought nothing this year. This year nobody has a 0. Agata hasn't ordered since last autumn, and she isn't on it at all. Neither is the woman who signed up at the fair. MF-16.

The round-up's query starts the right way, with every customer and a `LEFT JOIN` to their orders and lines, and adds up what each spent. Then comes `WHERE o.placed_at >= '2026-01-01'`.

## How it happens

A `LEFT JOIN` keeps every row of the table before it. A customer with no partner is kept once, with `NULL` in every column of the other table. That is the whole point of it.

`WHERE` runs after the join, on the rows it made. On a customer the join kept with no order, `o.placed_at` is `NULL`, the test is unknown, and the row goes. On a customer whose orders are all from 2025, every row has an old date, every row fails, and the customer goes. What is left is exactly what a plain `JOIN` would have given: the `LEFT` still sits in the query, doing nothing.

It is an honest mistake. "Only this year's orders" sounds like a condition on the result, and `WHERE` is where conditions go. On the customers who did order this year it gives the right totals, and those are the rows anyone checks first.

## See it for yourself

The same thing happens on any `LEFT JOIN`. Take every seed with its restocks from 2026:

```sql
SELECT p.name, r.received_on, r.packets
FROM products AS p
LEFT JOIN restocks AS r ON r.product_id = p.id
WHERE r.received_on >= '2026-01-01';
```

It returns 5 rows. There are twelve seeds; the seven whose restocks all came in 2025 have vanished. Move the test into the `ON`:

```sql
SELECT p.name, r.received_on, r.packets
FROM products AS p
LEFT JOIN restocks AS r ON r.product_id = p.id AND r.received_on >= '2026-01-01';
```

```
name                      | received_on | packets
--------------------------+-------------+--------
Scarlet runner bean       | 2026-06-01  | 20
Purple sprouting broccoli | NULL        | NULL
Golden beetroot           | 2026-08-20  | 10
...
(12 rows)
```

Now the test only decides which restocks count as partners. Every seed stays, and the ones with no restock this year carry `NULL`, which a total can turn into 0 with `COALESCE`. To list who a report loses, keep the rows with no partner: `WHERE r.id IS NULL` after this join is a test on the partner itself, which is exactly what you want to see.

A common patch is `WHERE r.received_on >= '2026-01-01' OR r.received_on IS NULL`. It brings back the seeds with no restocks at all, and still loses every seed whose restocks are all old, because those rows have a date, just not this year's.

## When the test is two tables away

Sometimes the column you test is not on the table you add up. Say you total the payments of each customer, but only for orders from 2026: customers, then orders, then payments, with the test on orders. Put the test in the `ON` of orders and an old order stops pairing with its customer, so its payments never arrive. That works, because the test sits on the step that connects the payments to the customer.

Turn the chain round and it stops working. If the test sits on the last table and the numbers you add up sit on the middle one, a middle row whose partner was turned away is still paired with the row you keep, and its numbers still reach `SUM`. Then the test has to choose the middle rows: add them up first in a query in brackets that keeps only the rows you want, and join that total.

## Your work in this issue

Three files in `queries/`. In `1-left-out.sql`, list the customers the round-up leaves out. In `2-round-up.sql`, fix the round-up. In `3-november-packets.sql`, fix Dunstan's re-order list, which nobody has complained about yet. Run each with `node run.mjs` and the file's name, and check a customer or a seed with old rows by hand. Check runs your query on the data you can see and on hidden data.
