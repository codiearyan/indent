# The win-back list that came back empty

## What you will be able to do

The statements count every payment once now. The next ticket is about rows that are not counted at all: they vanish from a report without an error, and the report looks tidy. By the end of this issue you will be able to:

- explain why one `NULL` in the list after `NOT IN` empties the whole result
- say what `<>`, `NOT LIKE` and `COUNT(column)` do with an empty cell
- find the rows that make a report lose others, as proof
- decide what an unknown value should mean for a report, and write that down in the query

## The ticket

> **Perpetua:** Every December I email the customers who have gone quiet since the summer, with a little money off their next order. The win-back list came back empty this year. Not one name. I can count four people on my fingers who have not ordered since the summer, Godric for one. MF-15.

The list's query reads well:

```sql
SELECT c.name AS customer, c.email
FROM customers AS c
WHERE c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.placed_at >= '2026-09-01');
```

Every customer whose id is not among the customers who ordered since September. Run it, and it returns no rows at all.

## How it happens

Since the market stall started, its sales go into the same orders table, typed in after market day with the date and no customer. Their `customer_id` is `NULL`. So the list in brackets holds the real customer ids and, since September, a few `NULL`s too.

`NOT IN` is a row of "not equal" tests joined by `AND`: `3 NOT IN (1, 2)` means `3 <> 1 AND 3 <> 2`. Add a `NULL` to the list and one of the tests becomes `3 <> NULL`. A comparison with `NULL` is neither true nor false; it is unknown, because nobody knows what the empty cell holds. `true AND unknown` is unknown, and `WHERE` keeps a row only when its condition is true. So once the list holds one `NULL`, `NOT IN` is never true for anyone, and every customer drops out. You can watch it happen in the terminal:

```sql
SELECT 3 NOT IN (1, 2) AS plain, 3 NOT IN (1, 2, NULL) AS with_null;
```

```
plain | with_null
------+----------
1     | NULL
(1 row)
```

`1` is true. `NULL` is the unknown, and a `WHERE` treats it as no. The query was right on the day it was written, before the stall's sales were in the table. Nothing changed in the query; the data grew an empty cell.

The same unknown hides in quieter places. "Every customer whose email is not at mail.example":

```sql
SELECT name, email FROM customers WHERE email NOT LIKE '%@mail.example';
```

returns 5 rows, and Bartholomew Bellamy and Auberon Fitch are not among them. They gave no email, `NULL NOT LIKE ...` is unknown, and they vanish. Here nothing empties; two people just are not there, which is worse, because nobody notices.

## Counting the gaps

Counting has the same habit. `COUNT(*)` counts rows. `COUNT(email)` counts the rows where `email` is not empty:

```sql
SELECT COUNT(*) AS customers, COUNT(email) AS emails FROM customers;
```

```
customers | emails
----------+-------
12        | 10
(1 row)
```

Both are honest answers to different questions. The bug is asking one when you mean the other: counting a column that can be empty when you meant to count the people.

## How to mend it

First decide what an unknown means for this report, then write it into the query. That is a question about the business, not about SQL, and the person who asked for the report has the answer.

For the win-back list, a market sale belongs to nobody on the list, so it should not be in the list after `NOT IN`. Keep only real customer ids there. For the email example, the rule might be "people with no email count as not at mail.example", and then it says so: `email IS NULL OR email NOT LIKE '%@mail.example'`. That gives 7 rows, both of them back. And when you mean people, count rows with `COUNT(*)`, not a column that can be empty.

To find the rows a report loses, look for the empty cells the condition touches: `IS NULL` on that column lists them.

## Your work in this issue

Three files in `queries/`. In `1-emptying-orders.sql`, list the orders that empty the win-back list. In `2-win-back.sql`, fix the list. In `3-catalogues.sql`, fix the catalogue print run, which nobody has complained about yet: Perpetua's rule is in the file. Run each with `node run.mjs` and the file's name. Check runs your query on the data you can see and on hidden data, with other customers and other gaps.
