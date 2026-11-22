# A search that shows every order

## What you will be able to do

Larkspur Letterpress is a two-press print studio. It prints wedding invitations, menus and posters, and its customers order, follow and change their orders on a small portal a friend built over a few weekends. You have just become its developer. By the end of this issue you will be able to:

- explain how text typed into a form can change a database query
- reproduce a search that hands one customer another customer's orders
- fix the query so values travel apart from the SQL
- write a test that catches the fix which only cleans the text

## The ticket

Deshawn Pirelli runs the front desk and answers the customer emails. A forwarded email arrives with a note on top.

> **Deshawn:** Yusra says the order search gets an error page for a search for Mother's Day. While I was looking at the log I found something worse. Someone signed in as a customer searched for a strange bit of text with quotes in it, and the portal answered with forty rows. That is every order we have, other people's included. LL-12.

The error Yusra saw:

```
Error: near "s": syntax error
```

## The idea: a query is text, and so is the search

The portal talks to its database in SQL, and SQL is text. The search builds that text by pasting the customer's words into the middle of it. Look at the same habit somewhere else, a lookup of gift vouchers by their code:

```js
const sql = `SELECT amount FROM vouchers WHERE code = '${code}'`
```

With the code `SPRING10` the database reads `WHERE code = 'SPRING10'`, and all is well. Now someone types `x' OR '1'='1`. The database reads:

```sql
SELECT amount FROM vouchers WHERE code = 'x' OR '1'='1'
```

The quote in the code closed the string early, and the rest became SQL: a condition that is always true. Every voucher matches. Nobody broke in; the program asked the database exactly that question. The text was treated as part of the query, so whoever writes the text writes part of the query.

Two more pieces finish the picture. Two dashes, `--`, start a comment, so everything after them on that line is ignored, including the closing quote the program meant to add. And an honest apostrophe, as in Yusra's search, closes the string just the same. It only leaves broken SQL behind, which is why that search showed an error. The error and the leak have one cause.

## How to fix it: values travel apart

Every database library has a way to send the query and the values separately. In `node:sqlite` a `?` marks where a value goes, and the values are handed to the statement when it runs:

```js
const sql = 'SELECT amount FROM vouchers WHERE code = ?'
db.prepare(sql).get(code)
```

Now the SQL text never changes, whatever the code holds. The database first reads the query, with a hole where the value goes, and only then receives the value. A value can never become a keyword, a quote or a comment, because it is not read as SQL at all. `x' OR '1'='1` is simply a code no voucher has.

Use one `?` per value, and pass the values in the same order. A `LIKE` pattern is a value too: the `%` signs that mean "anything here" go into the value, not into the query.

## Why cleaning the text is not the fix

The tempting fix is to keep pasting and clean the text first: strip the quotes, or block words like `OR`. It looks careful and it is wrong in two ways. It breaks honest input: Yusra's search for Mother's Day turns into a search for `Mothers Day`, which finds nothing. And it is a race you cannot win. You have to know every character that means something to this database, in every place a value can sit, and one miss leaves the hole open. Passing values separately does not depend on knowing any of that.

Numbers too. The customer id comes from the session today, but it might come from a link tomorrow. Pass it as a value, and where it came from stops mattering.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It runs three customers' searches from `src/seed.js`. On Node 22 it first prints a line saying SQLite is experimental; that is expected. Then make the hole visible in data: in `src/reproduce.js`, search as one customer with text that changes the query, and return what came back. Rows that belong to another customer are the proof you attach to LL-12.

## How to test it

A good test calls `searchOrders()` with a fresh `openDb()` and checks the ids that come back. Send text that tries to reach other orders and expect nothing. Then add an honest search that holds a quote and expect the right order. The first catches the original code, and the second catches the fix that only cleans the text.

## Your work in this issue

Start in `src/reproduce.js`, then fix `src/search.js`, then write `src/search.test.js`. Run your tests with `npx vitest run src/search.test.js`. The check runs them beside the original code, a correct fix and the strip-quotes fix, and expects fail, pass, fail.
