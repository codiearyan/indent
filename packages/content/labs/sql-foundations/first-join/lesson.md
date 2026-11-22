# Two tables at once

## What you will be able to do

Every query so far read one table. Yet most questions at the practice cross from one table to another: who owns this animal, which animal came to that visit, what was charged and on which day. The answer is in the database, split over two tables, and in this issue you put the two halves together in one query. By the end of it you will be able to:

- say why the records are split over several tables, and how an id points from one table to another
- join two tables with `JOIN ... ON`
- name the table a column comes from, and give a table a short name
- read the errors a join gives, and spot the two mistakes it gives no error for

## The request from Winnie

> **Winnie:** When someone rings about Biscuit, I find Biscuit in one list and then hunt for his owner in another. Can I have each animal with its owner's name? Mabel wants the animals out in Larkhill with a number to ring, for her home visits. Rosamund wants a date and a vet beside every treatment, not just a price. And Ifan wants his visits with the animal he saw.

## Why there are four tables

Look at `animals` in `schema.sql`. There is no owner's name in it, and no phone. There is a column called `owner_id`. Biscuit's row has `owner_id` 1, and in `owners` the row with `id` 1 is Gwen Parry. That number is the whole link.

Why not write Gwen's name and phone on every one of her animals? Because then her phone would be stored twice, once for Biscuit and once for Pepper. The day she changes her number, someone has to find and change every copy, and one copy always gets missed. Kept in `owners`, her number exists once.

Each table has an `id` column marked `PRIMARY KEY`: a number that is different for every row, so it names one row and only one. A column like `owner_id`, which holds the id of a row in another table, is often called a foreign key. The practice has three: `animals.owner_id` points at an owner, `visits.animal_id` at an animal and `treatments.visit_id` at a visit. The comments in `schema.sql` say so.

## Joining two tables

`JOIN` puts the rows of two tables side by side. `ON` says which pairs belong together:

```sql
SELECT visits.visit_date, animals.name, animals.weight_kg
FROM visits
JOIN animals ON visits.animal_id = animals.id;
```

Read it the way SQLite works. For each visit, it looks for the animal whose `id` equals the visit's `animal_id`, and puts the two rows together into one wide row with the columns of both. Then `SELECT` picks columns from that wide row, from either table. Run the same query with `SELECT *` and you can see the whole wide row.

The order of the tables does not change which rows come back: `FROM animals JOIN visits ON ...` pairs the same rows. A `WHERE` and an `ORDER BY` go after the join, as before, and can use the columns of both tables.

## Which table a column comes from

`visits.visit_date` means "the `visit_date` column of `visits`". When a column name exists in only one of the two tables, SQLite can find it without the table's name. When it exists in both, it cannot. Write `ON animal_id = id` and SQLite stops with `ambiguous column name: id`, because both tables have an `id`. Name the table in front of the column and the error goes. Many people name the table in front of every column of a join, so a reader never has to guess. And when two columns of the result would have the same name, say the name of an animal and the name of a treatment, give each its own with `AS`.

Writing the table's name each time gets long, so a table can have a short name, given with `AS` after it:

```sql
SELECT v.visit_date, a.name, a.weight_kg
FROM visits AS v
JOIN animals AS a ON v.animal_id = a.id;
```

`AS` can be left out: `FROM visits v` does the same. Once a table has a short name, use that name everywhere in the query. Writing `visits.reason` after `FROM visits AS v` gives `no such column: visits.reason`.

## Two mistakes with no error

The first is an `ON` that pairs the wrong columns. `ON v.id = a.id` runs, and gives the same number of rows, but it puts visit 3 beside animal 3, who has nothing to do with it. The names look like answers. So check one row by hand: take a row of your result, find it in `seed.sql`, and follow the id across.

The second is a join with no `ON` at all. SQLite then pairs every visit with every animal: 18 visits and 22 animals give 396 rows, almost all of them nonsense. SQLite runs it without a word, though some databases refuse a `JOIN` with no `ON`. When a join gives far more rows than either table holds, look for the missing `ON`.

## Your work in this issue

Four files in `queries/`, one task each. Run each with `node run.mjs` and the file's name, and check a row or two by hand in `seed.sql`. Then press Check. It compares the columns and the rows on the data you can see and on hidden data, where the ids are other numbers, so a query that pairs the wrong ids cannot pass by chance. Task 4 asks for an order, and Check compares it there.
