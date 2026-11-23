# Making a table

## What you will be able to do

You can read any table and change its rows. Every table so far was already there, made by `schema.sql`. This issue makes new ones, and the rules a table keeps are the part that matters: a good table refuses a bad row before it gets in, so nobody has to find it later. By the end of it you will be able to:

- make a table with `CREATE TABLE`, choosing a type for each column
- give it a key that fills itself in
- add the rules `NOT NULL`, `UNIQUE` and `DEFAULT`, and make a column point at another table
- read the error each rule gives when a row breaks it

## The request from Rosamund

> **Rosamund:** We keep things on paper that belong in the database. The vets' names are typed into every visit by hand. Microchip numbers are on cards, booster reminders in a diary, appointments in a book at the desk, and the prices on a sheet that nobody agrees on. I want a table for each, and I want them to refuse rubbish.

## A table and its columns

Here is a table for the companies that deliver food and supplies:

```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  country TEXT NOT NULL DEFAULT 'UK'
);
```

After the table's name, in brackets, come the columns with a comma between each two. Each column has a name, a type, and then any rules. The types this engine knows are `INTEGER` for whole numbers, `REAL` for numbers with a fraction, `TEXT`, and `BLOB` for raw bytes such as a picture. A phone number is text, even though it is made of digits: as a number, 01632960500 would lose its first 0.

In this engine a column's type is a preference, not a rule, where most databases treat it as a rule. In an `INTEGER` column, `'12'` is turned into the number 12, but `'a dozen'` is kept as text, without an error. To make the types rules, write `STRICT` after the closing bracket. Then a value of the wrong type is refused with `cannot store TEXT value in INTEGER column`, followed by the column's name, and only the types above are allowed, with `INT` as another name for `INTEGER` and `ANY` for a column that takes every type.

Make a table whose name is taken and SQLite says `table suppliers already exists`.

## The key

`id INTEGER PRIMARY KEY` makes `id` the table's key: every row has a different one, and a row added without an id gets the next free one. Two rows with the same id are refused with `UNIQUE constraint failed: suppliers.id`. The words matter here. Only a column declared exactly `INTEGER PRIMARY KEY` fills itself in. With `INT PRIMARY KEY`, or a key of another type, a row added without an id is let in with no id at all.

## Rules for a column

Rules come after a column's type, in any order.

`NOT NULL` means the column is never empty. A row without it is refused with `NOT NULL constraint failed: suppliers.name`.

`UNIQUE` means no two rows share a value in that column. A second Fernlea Feeds is refused with `UNIQUE constraint failed: suppliers.name`. Empty cells do not count as a value, so `UNIQUE` alone still lets several rows be empty. A column that must be filled in and never repeat needs both rules.

`DEFAULT` gives the value a column takes when a row leaves it out. A supplier added with only a name gets `'UK'` as its country. A default does not stop a row from setting the column to `NULL` on purpose; only `NOT NULL` does that.

## A key that points at another table

`owners`, `animals` and `visits` use columns like `owner_id` that hold the id of a row in another table, but nothing in `schema.sql` makes that a rule. `REFERENCES` does:

```sql
CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id),
  arrived TEXT NOT NULL,
  boxes INTEGER NOT NULL
);
```

Now a delivery from a supplier id that no row of `suppliers` has is refused, and so is removing a supplier that still has deliveries. Both give `FOREIGN KEY constraint failed`, which does not say which row; look at the ids in your statement. A `REFERENCES` that names a table that is not there is not refused when the table is made, only when the first row goes in: SQLite then says `no such table: main.supplier`, with the name you wrote.

This engine only keeps that rule when it is switched on for the connection, with `PRAGMA foreign_keys = ON`, where most databases always keep it. `run.mjs` and Check both switch it on, so you never need to write it.

## Your work in this issue

Five files in `queries/`, one table each. Write your `CREATE TABLE` at the top of each file. Below it are rows that try your table: some should go in and some should be refused. Run the file with `node run.mjs` and the file's name. It makes a fresh copy of the database every time, shows the table you made with its rules, and says what happened to each row, so a table you get wrong costs nothing: change it and run again. Then press Check. It runs only your `CREATE TABLE`, looks at the columns and their types, and tries rows of its own.
