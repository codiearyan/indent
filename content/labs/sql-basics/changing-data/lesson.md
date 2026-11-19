# Changing data safely

## What you will be able to do

So far you have only read data. Now Odile wants you to keep the database up to date: new cafes, a price review, a cancelled order. Reading a wrong answer costs a minute; writing a wrong change can cost a week of invoices. By the end of this chapter you will be able to:

- add rows with INSERT and let the database choose ids
- change rows with UPDATE and remove them with DELETE, touching only the rows you mean to
- group several changes into a transaction, so they all happen or none do
- check a change by looking at the table afterwards

## INSERT

`INSERT INTO table (columns) VALUES (values);` adds one row. List the columns you fill in, and give the values in the same order. Any column you leave out gets its default, which is NULL unless the schema says otherwise.

The `id` columns here are `INTEGER PRIMARY KEY`. Leave them out and SQLite picks the next free number. Typing an id yourself is risky: it might already be taken, and it hides a guess about data you cannot see. When a new row must point at another one, look up the id with a subquery, such as `(SELECT id FROM drivers WHERE name = 'Wes Abara')`.

## UPDATE and DELETE

`UPDATE table SET column = value WHERE condition;` changes the matching rows. The new value can use the old one, so `stock = stock - 1` works row by row. `DELETE FROM table WHERE condition;` removes the matching rows.

Both are only as precise as their WHERE clause, and both change every row in the table when it is missing. Write the WHERE clause as a SELECT first, read the rows, then swap in UPDATE or DELETE.

Think about what other tables say, too. Deleting a product that old orders point at would leave those orders pointing at nothing. The schema declares these links with `REFERENCES`, and this database checks them, so such a DELETE stops with `FOREIGN KEY constraint failed`. Many databases run with that check switched off, so do not lean on it: write the WHERE clause so it never tries.

## Transactions

Some changes only make sense together. Moving stock back from an order and marking the order cancelled are two statements, but one change. If the first ran and the second failed, the shelf count and the order would disagree. A transaction groups statements. Here, one driver is away for a week, so another takes over her pending orders and her van:

```sql
BEGIN;
UPDATE orders SET driver_id = 2 WHERE driver_id = 4 AND status = 'pending';
UPDATE drivers SET van = 'Van 4' WHERE id = 2;
COMMIT;
```

Between BEGIN and COMMIT, nobody else sees your changes. COMMIT makes them all permanent at once. `ROLLBACK` instead of COMMIT throws them all away. Forgetting COMMIT is a classic mistake: the changes look fine in your session and then vanish.

## Keeping totals consistent

A good way to check a change is to state something that must stay true and test it. For the cancelled order: the total stock after the change must equal the total before, plus the number of items in the order. If the sum is off, you missed a product or changed one you should not have.

A trap waits in correlated updates. If a subquery in SET finds no row, it returns NULL, and anything plus NULL is NULL. An UPDATE meant for three products, written without a WHERE clause, tries to set the stock of every other product to NULL. Here the `NOT NULL` rule on `stock` stops it with an error. Without that rule, the stock would be wiped without a word.

## Looking before and after

`node run.mjs` runs every statement in your file in order and builds a fresh database each time, so nothing you try is kept. Put a `SELECT` before and after your changes in the same file to see both states side by side.

## How your work is checked

These tasks are checked by the state they leave behind, not by what they print. The check runs your file on the shipped data and on a hidden dataset, then compares whole tables with the tables a correct change produces. The message names the table and the row that differs. Any SELECT you leave in the file is ignored.
