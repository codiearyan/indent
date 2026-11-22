# Your first query

## What you will be able to do

Hollybank Vets is a small practice with two vets, a front desk and a waiting room that smells of dog. Every owner, every animal and every visit is kept in a database that Ifan Pryce, one of the vets, set up years ago. He is the only one who knows how to ask it anything, so every question waits until he is out of surgery. You have just joined to change that, and you have never seen a database before. That is fine: this issue starts at the very beginning. By the end of it you will be able to:

- say what a database, a table, a row and a column are
- write a query that returns a whole table
- run a query in the terminal and read the rows it prints
- read an error from the database and fix what it points at

## The request from Winnie

Winnie Thornbury runs the front desk.

> **Winnie:** Somebody rings, says "it's about Biscuit", and I have no idea who Biscuit is. Can you just show me everything we have? All the animals, all the owners. And Ifan left a query that is meant to list the visits, but it only prints an error.

## Tables, rows and columns

A database is a place that keeps information in an orderly way, so you can ask it questions later. The one at Hollybank is a SQLite database, a small database that lives in a single file and comes built into Node.

The information sits in tables. A table looks like a grid. Each row is one thing, for example one animal. Each column is one fact about every thing in the table, for example the animal's name or its weight. The practice has four tables: `owners`, `animals`, `visits` and `treatments`.

Open `schema.sql` to see them. Each `CREATE TABLE` names a table and lists its columns, one per line, with the kind of value it holds: `TEXT` for words, `INTEGER` for whole numbers, `REAL` for numbers with a decimal point. You will write your own `CREATE TABLE` in a later issue; for now, read it like a map. `seed.sql` holds the rows themselves.

Some cells hold `NULL`. That means nothing was recorded there: Willow has never been weighed, so her weight is `NULL`. A later issue is all about these empty cells.

## Asking with SELECT

You ask a database a question with a query, written in a language called SQL. The simplest query asks for a whole table:

```sql
SELECT * FROM treatments;
```

Read it from left to right. `SELECT` means "give me". `*` means "every column". `FROM treatments` says which table. The semicolon at the end marks where the query stops. The words SQL itself knows, like `SELECT` and `FROM`, are called keywords. Letter case does not matter for them, so `select * from treatments;` works just as well. Many people write keywords in capitals so they stand out from the names of tables and columns.

A query only reads. It never changes the table, so you can run it as often as you like.

Lines that start with two dashes, `--`, are comments: notes for people, which SQLite skips. Each file in `queries/` starts with a few of them to tell you what the task is.

## Running a query

Your queries go in the files under `queries/`, one query per file. To run one, type this in the terminal and press Enter:

```
node run.mjs queries/1-every-animal.sql
```

`run.mjs` builds a fresh copy of the practice's database from `schema.sql` and `seed.sql`, runs the query in your file and prints the rows that come back, with the column names on top and the number of rows at the bottom. The copy is thrown away afterwards, so nothing you run can harm the real records.

## When SQLite says no

Sooner or later SQLite will refuse a query and print an error instead of rows. That is normal, and the error is there to help. It starts with `SQL error:` and shows the first line of the statement below it. Three you will meet early on:

- `near "SELEKT": syntax error` means SQLite did not understand the words around that spot. Often the word it names is misspelt. Sometimes the mistake is just before it, because SQLite only notices it is lost one word later.
- `no such table: treatment` means there is no table with that name. Compare it with the names in `schema.sql`, letter for letter.
- `no such column: weight` is the same, for a column.

Fix one thing, run the file again and read what changes. SQLite stops at the first problem it finds, so a query with two mistakes gives two errors, one after the other.

## Your work in this issue

Open `queries/1-every-animal.sql` and write your first query below the comments. Run it, and look at the rows: you have just answered Winnie's question about Biscuit. Then do `queries/2-every-owner.sql`, and finally fix Ifan's query in `queries/3-fix-the-query.sql` by reading its errors one at a time. Keep exactly one query in each file. When a file prints what the task asks for, press Check. Check runs your query against the data you can see and against a second, hidden set of rows, and compares what comes back.
