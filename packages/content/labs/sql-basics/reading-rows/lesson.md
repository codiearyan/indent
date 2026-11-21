# Reading rows

## What you will be able to do

Brindle Bakehouse bakes bread, pastries and cakes for cafes in four coastal towns. Tobias Venn runs the ovens and Odile Marsh runs everything else: deliveries, invoices and the phone. Every order lives in a small SQLite database, and until today the only way to get an answer from it was to ask the person who set it up years ago. You are the bakehouse's first developer. By the end of this issue you will be able to:

- pick the columns you want from a table and rename them
- keep only the rows that match a condition, using comparisons, AND, OR, IN and LIKE
- find missing values with IS NULL
- sort the result and keep only the first few rows

## The database you are working with

Open `schema.sql`. It creates five tables: `cafes`, `products`, `drivers`, `orders` and `order_items`. Each table is a grid. Every row is one thing (one cafe, one order) and every column is one fact about it. `seed.sql` fills the tables with the real data.

Your SQL goes in the files under `queries/`. To run one, type this in the terminal:

```
node run.mjs queries/1-port-ellery-cafes.sql
```

The runner builds a fresh copy of the database every time, runs your file and prints the result as a table. Nothing you run is saved, so experiment freely. A quick `SELECT * FROM cafes;` shows a whole table, and `*` means every column.

## Choosing columns

A query starts with `SELECT`, a list of columns, and `FROM` with the table name. The columns come back in the order you list them. `AS` renames a column in the result, which helps when the stored name is long or unclear. The table itself does not change.

## Choosing rows with WHERE

`WHERE` keeps only the rows for which a condition is true. You can compare with `=`, `<>` (not equal), `<`, `<=`, `>` and `>=`. Text goes in single quotes and must match exactly.

Combine conditions with `AND` (both must hold) and `OR` (either may hold). AND binds tighter than OR, just like multiplication binds tighter than addition, so use parentheses whenever you mix them. Two shortcuts save typing:

- `town IN ('Saltmarsh', 'Hollins Ford')` is true when the value is any of the listed ones.
- `name LIKE '%bun%'` matches text by pattern: `%` stands for any run of characters and `_` for exactly one. In SQLite, LIKE ignores the case of plain letters.

Here is a query on the drivers table that uses several of these ideas:

```sql
SELECT name, van AS vehicle
FROM drivers
WHERE van IN ('Van 1', 'Van 3') OR name LIKE 'N%'
ORDER BY name
LIMIT 2;
```

## Missing values

Some cells hold `NULL`, which means "no value". NULL is not zero and not empty text, and any comparison with it gives an unknown result, so `contact_email = NULL` matches nothing at all. Use `IS NULL` to find missing values and `IS NOT NULL` to skip them.

## Sorting and limiting

Rows come back in no promised order unless you ask for one. `ORDER BY column` sorts from smallest to largest (A to Z for text). Add `DESC` to reverse it, and list several columns to break ties. `LIMIT n` keeps only the first n rows after sorting, so it always goes last.

The parts of a query always appear in this order: SELECT, FROM, WHERE, ORDER BY, LIMIT.

## How your work is checked

Each task names the columns it expects. The check runs your file against the shipped data and against a second, hidden dataset with different cafes and products, then compares column names and values. Order matters only when the task asks for one. A query that copies names or numbers from the visible data instead of describing the rule will pass the first comparison and fail the second.
