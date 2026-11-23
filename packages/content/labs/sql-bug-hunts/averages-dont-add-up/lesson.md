# Averages that do not add up

## What you will be able to do

So far the wrong numbers came from rows: counted twice, or lost. This time every row is there, and the arithmetic on them is wrong. A division, an average or a filter can each give an answer that looks like a number about the business and is a number about something else. By the end of this issue you will be able to:

- spot a division between whole numbers that drops the fraction
- tell an average of orders from an average of averages
- say whether a condition belongs in `WHERE` or in `HAVING`
- prove an average wrong with the two numbers it should have come from

## The ticket

Clemency Thackeray checks Mallowfield's accounts at the end of every month.

> **Clemency:** For the year-end notes I need the average order on each channel. Your report says a phone order is £15.80 on average and a market sale is exactly £6. I added up every phone order and divided by how many there are, and I get less than that. And the market can't come out at exactly six pounds. Which do I trust? MF-17.

The report's query works in two steps. The inner query takes each customer on each channel and works out their average order. The outer query averages those for each channel.

## Whole numbers divide whole

Money here is stored in pence, as whole numbers, so nothing is lost to rounding when it is added up. That is a good choice, with one catch you met in the foundations course: when both sides of a division are whole numbers, SQLite gives a whole number and throws the rest away.

```sql
SELECT 770 / 100 AS whole, 770 / 100.0 AS decimal, 5 / 2 AS half;
```

```
whole | decimal | half
------+---------+-----
7     | 7.7     | 2
(1 row)
```

Turning pence into pounds with `/ 100` makes £7.70 into 7. Nothing warns you: the column just looks like whole pounds. Write `100.0`, and the division keeps its fraction. `AVG` always gives a decimal, but a division you write yourself does not.

## An average of averages

The other fault hides in the two steps. Averages only combine fairly when every group has the same number of rows behind it. Here are the seeds by kind:

```sql
SELECT kind, COUNT(*) AS seeds, AVG(price_pence) AS average FROM products GROUP BY kind;
```

```
kind      | seeds | average
----------+-------+-------------------
flower    | 4     | 257.5
herb      | 3     | 213.33333333333334
vegetable | 5     | 271
(3 rows)
```

Average those three averages and you get 247.28 pence. The average price of a seed, `AVG(price_pence)` over all twelve, is 252.08. The average of averages gives the three herbs as much say as the five vegetables. Neither number is wrong in itself; one answers "what does a seed cost" and the other answers a question nobody asked.

The report does this with customers. A customer with five phone orders and a customer with one each give one average, and each average counts once. Clemency asked what one order comes to, so every order has to count once: work out each order's total first, then average the orders.

To prove an average wrong, give the person the two numbers it should come from: how many there are, and what they add up to. If the report's average is not one divided by the other, it is answering another question.

## A test on a total

`WHERE` runs on single rows, before they are grouped. `HAVING` runs on each group, after it is added up. Try a test on a total in `WHERE` and SQLite refuses with `misuse of aggregate: SUM()`. The quiet mistake comes next: rewriting the test so the error goes away. Here are the seeds that received more than 25 packets in a delivery, added up:

```sql
SELECT p.name, SUM(r.packets) AS received
FROM products AS p
JOIN restocks AS r ON r.product_id = p.id
WHERE r.packets > 25
GROUP BY p.id, p.name;
```

It returns 6 seeds, and Scarlet runner bean shows 40 received. It received 60: the delivery of 20 was thrown away before the sum. A test on single rows keeps big rows, not big totals, and it changes the total too. The test on the total goes after `GROUP BY`:

```sql
SELECT p.name, SUM(r.packets) AS received
FROM products AS p
JOIN restocks AS r ON r.product_id = p.id
GROUP BY p.id, p.name
HAVING SUM(r.packets) > 40;
```

A test that really is about single rows, such as which dates count, stays in `WHERE`, so that only those rows are added up. In `HAVING`, a plain column of a group gives the value of one of its rows, and which one is not yours to choose.

## Your work in this issue

Three files in `queries/`. In `1-hand-count.sql`, give Clemency the two numbers behind each channel's average. In `2-averages.sql`, fix the average order. In `3-trade-price.sql`, fix the trade price list, which nobody has complained about yet. Run each with `node run.mjs` and the file's name. Check runs your query on the data you can see and on hidden data, where the averages do not come out even.
