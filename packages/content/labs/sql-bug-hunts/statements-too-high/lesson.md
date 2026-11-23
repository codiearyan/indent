# Statements that charge too much

## What you will be able to do

Mallowfield Seeds sells packets of seed from its website, over the phone and at a Saturday market stall. Perpetua Kersey owns it and keeps the books, Dunstan Achebe packs every order in the shed and runs the stall, and Clemency Thackeray comes in at the end of each month to check the accounts. Everything they know about the business comes from a handful of SQL reports, and you are the developer who now looks after them. By the end of this issue you will be able to:

- explain why a join can count one row several times without any error
- list the exact rows a report counts more than once, as proof
- fix a total by adding it up before the join, not after
- say why `DISTINCT` does not mend a sum

## The ticket

> **Perpetua:** Rosalind Teague rang this morning. Her statement says she has paid us £23.10. She has paid £7.70: one order in September, and I can see the one card payment in the bank. Dunstan says the packets on the community garden's statement look far too high as well. Can you find out what the statements are doing? MF-14.

Run the statements and look at Rosalind's row:

```
customer                    | packets | paid_pence
----------------------------+---------+-----------
Rosalind Teague             | 3       | 2310
Godric Fairweather          | 4       | 1400
```

2310 pence is three times 770. Her packets are right, though. Something triples her payment and leaves her packets alone.

## How it happens

The statement query joins four tables: each customer to their orders, each order to its lines, and each order to its payments. Both the lines and the payments hang off the order. A join pairs every row on one side with every row on the other side that matches, so an order with three lines and one payment becomes three rows, each carrying the same payment. An order with three lines and two payments becomes six rows: every line meets every payment.

Nobody wrote anything wrong. Each `ON` is correct, the query runs, and on an order with one line and one payment it gives the right answer. That is why it survived: the first orders anyone checked by hand were small ones. Then the sums run over the joined rows, and `SUM` adds every row it is given, copies included. Rosalind's one payment sits on three rows, so it is added three times. An order paid in two parts doubles its packets the same way.

## See it for yourself

Order 14 is Isadora Dunsford's: three lines, paid partly with a gift voucher and partly by card. Ask the join for just that order:

```sql
SELECT o.id, l.packets, p.method, p.amount_pence
FROM orders AS o
JOIN order_lines AS l ON l.order_id = o.id
JOIN payments AS p ON p.order_id = o.id
WHERE o.id = 14;
```

```
id | packets | method  | amount_pence
---+---------+---------+-------------
14 | 2       | card    | 880
14 | 2       | voucher | 500
14 | 2       | card    | 880
14 | 2       | voucher | 500
14 | 1       | card    | 880
14 | 1       | voucher | 500
(6 rows)
```

Three lines times two payments is six rows. Add them up as they stand and the order has 10 packets and was paid 4140 pence. It has 5 packets and was paid 1380. Whenever a total looks too high, look at the rows before they are added up: put `SELECT *` on the join, narrow it to one thing, and count.

## How to mend it

Add each total up where every thing is one row, and only then join. The packets of an order come from its lines alone, and its payments from its payments alone. A query in brackets after `FROM`, as the foundations course showed, does exactly that:

```sql
SELECT o.id, b.packets, q.paid_pence
FROM orders AS o
JOIN (SELECT order_id, SUM(packets) AS packets FROM order_lines GROUP BY order_id) AS b ON b.order_id = o.id
JOIN (SELECT order_id, SUM(amount_pence) AS paid_pence FROM payments GROUP BY order_id) AS q ON q.order_id = o.id
WHERE o.id = 14;
```

```
id | packets | paid_pence
---+---------+-----------
14 | 5       | 1380
(1 row)
```

Each query in brackets gives one row per order, so the joins after it pair one row with one row and nothing repeats. The same works for any level you group at, as long as each total is worked out before it meets the other table.

Two patches are tempting, and both are wrong. `SUM(DISTINCT amount_pence)` adds each different value once, so a customer who paid 500 twice for two real orders is charged 500 once. A copy made by the join looks exactly like a real second payment of the same amount. Dividing by the number of payments mends one order and breaks the next, because orders repeat a different number of times. Neither touches the cause.

## Your work in this issue

Three files in `queries/`. In `1-counted-twice.sql`, list the orders the statements count more than once, so Perpetua can see them. In `2-statements.sql`, fix the statements. In `3-stock-check.sql`, fix Dunstan's stock check, which nobody has complained about yet. Run each with `node run.mjs` and the file's name, and check one customer or one seed by hand in `seed.sql`. Check runs your query on the data you can see and on hidden data, where the repeats fall differently.
