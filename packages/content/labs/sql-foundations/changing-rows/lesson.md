# Adding, changing and removing rows

## What you will be able to do

Every query so far has only read. This issue writes. A wrong change is easy to make and quiet: no error, just the wrong rows changed, so you will also learn to look before you change, and to undo. By the end of it you will be able to:

- add a row with `INSERT`
- change rows with `UPDATE` and remove them with `DELETE`, with a `WHERE` that picks only the rows you mean
- read the errors the table's rules give when a row breaks them
- try a change inside a transaction and keep it with `COMMIT` or undo it with `ROLLBACK`

## The request from Winnie

> **Winnie:** A new owner signed up this morning, Moss came in and needs his record put right, and Pepper's bill has a charge on it twice. Rosamund also wants to know how many visits we would have left if the old ones went to the paper files, but she hasn't said yes yet, so nothing may go.

Each of these changes only a few rows. Each one, written carelessly, changes many more.

## Adding a row

`INSERT` adds a row. Here is Nia Calloway's kitten, who is coming in next week:

```sql
INSERT INTO animals (owner_id, name, species, breed, born, weight_kg)
VALUES (13, 'Sage', 'cat', NULL, '2026-09-14', NULL);
```

After the table's name comes a list of the columns you fill, then the values in the same order, one for one. Swap two values and SQLite puts each in the wrong column without a word. `NULL` with no quotes is an empty cell; `'NULL'` in quotes is four letters of text. A column you leave out of the list is empty too.

The `id` is left out on purpose. It is the table's key, `INTEGER PRIMARY KEY` in `schema.sql`, and a new row with no id gets the next free one. An id you type yourself may already belong to someone.

The table also has rules, and a row that breaks one is refused. Leave out a column marked `NOT NULL` and SQLite says `NOT NULL constraint failed: animals.species`. Give an id that is taken and it says `UNIQUE constraint failed: animals.id`. Leave out the list of columns and the values must cover every column of the table, id included, in the order of `schema.sql`; one short and it says `table animals has 7 columns but 6 values were supplied`. A refused row is not added at all.

## Changing rows

`UPDATE` changes values in rows that are already there:

```sql
UPDATE visits SET notes = 'Ear clear. No more drops.', vet = 'Ifan Pryce' WHERE id = 8;
```

`SET` lists each change, with a comma between two changes. Write `AND` there instead and SQLite reads one true-or-false test, so the first column gets `0` or `1`. The `WHERE` picks the rows, exactly as in a `SELECT`.

Here is the most important line of this issue: an `UPDATE` with no `WHERE` changes every row of the table. SQLite does not ask whether you are sure.

## Removing rows

`DELETE` removes whole rows:

```sql
DELETE FROM owners WHERE id = 13;
```

The same rule holds, more sharply: a `DELETE` with no `WHERE` empties the table. `DELETE` removes rows; to clear one value in a row, set it to `NULL` with `UPDATE`.

## Look before you change

Before a change, run its `WHERE` as a `SELECT`. The rows that come back are the rows the change will touch:

```sql
SELECT * FROM visits WHERE id = 8;
```

Then ask whether the `WHERE` could ever catch another row. A name is a poor choice: two animals can be called Moss, and a price or a date can repeat. The `id` is different for every row, so a `WHERE` on the `id` picks exactly one. Use a name to find the row with a `SELECT`, and the `id` to change it.

## Undo with a transaction

A transaction groups statements so that you decide at the end whether they count:

```sql
BEGIN;
UPDATE treatments SET price = price * 1.1;
SELECT name, price FROM treatments;
ROLLBACK;
```

`BEGIN` starts the transaction. The changes after it happen, and a `SELECT` inside sees them, but they are not kept yet. `COMMIT` keeps them. `ROLLBACK` undoes every change since `BEGIN`, as if it never ran. So `BEGIN`, a change, a look, and then `COMMIT` or `ROLLBACK` is a safe way to try something.

`ROLLBACK` or `COMMIT` with no `BEGIN` before them gives `cannot rollback - no transaction is active`. A second `BEGIN` before the first transaction ends gives `cannot start a transaction within a transaction`. And a transaction that is never ended is undone when the connection closes, so a file that forgets `COMMIT` changes nothing.

## Your work in this issue

Four files in `queries/`, one task each, in order. Run each with `node run.mjs` and the file's name. It builds a fresh copy of the database from `schema.sql` and `seed.sql` every time, runs every statement in the file and lists what changed. Nothing is saved, so a wrong `DELETE` in the terminal costs nothing: run it again and you start over. Then press Check. It runs your file on its own fresh copy of the data you can see and of hidden data with more rows, and compares every table afterwards: the right rows changed, and no other row.
