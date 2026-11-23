# A query inside a query

## What you will be able to do

Some questions need an answer before they can be asked. "Which animals are heavier than average?" needs the average first. "Which owners have a dog?" needs the list of dogs first. A query can do both steps at once, with a second query inside it, in brackets. By the end of this issue you will be able to:

- use a list from one query in the `WHERE` of another, with `IN`
- compare each row with one value worked out by another query
- tell when a query in brackets returns one value and when it returns many, and why it matters
- use a whole query as a table in `FROM`, and say when a join says the same thing more plainly

## The request from Rosamund

> **Rosamund:** Everyone has a question this week. The dog food supplier wants every owner with a dog, once each. Ifan wants the animals heavier than average for the newsletter. Mabel wants to see what the animals from Fernlea come in for, and I want to know what a visit to each vet comes to on average.

Each of these is one query wrapped around another.

## A list from another query

Here are the animals that have come in for a vaccine:

```sql
SELECT name, species
FROM animals
WHERE id IN (SELECT animal_id FROM visits WHERE reason LIKE '%vaccine%');
```

SQLite runs the query in brackets first. It returns one column, the ids of the animals that had a vaccine, and `IN` asks of each animal whether its `id` is in that list. The query inside may use another table, and it can have a query inside it in turn.

The query inside must return exactly one column, since `IN` compares one value with a list of single values. Ask for two and SQLite says `sub-select returns 2 columns - expected 1`.

## One value from another query

Here are the treatments that cost more than the average treatment:

```sql
SELECT name, price
FROM treatments
WHERE price > (SELECT AVG(price) FROM treatments);
```

The query in brackets returns one row with one value, so it can stand anywhere a number could. You cannot write `WHERE price > AVG(price)`: `WHERE` looks at one row at a time, and an average needs all of them. SQLite says `misuse of aggregate function AVG()`, with the name spelt as you wrote it. Work the average out in its own query, and the outer query compares each row with it. Typing in the number instead would only be right until the next treatment is added.

## One value or many

`IN` takes a list. `=`, `<` and `>` take one value. Use them with a query that returns several rows and this engine does not refuse, where most databases would: it quietly uses the first row and drops the rest.

```sql
SELECT visit_date, reason
FROM visits
WHERE animal_id = (SELECT id FROM animals WHERE species = 'rabbit');
```

Two rabbits have visits, but this returns the visits of only one. Before you write `=` in front of a query in brackets, ask whether it can ever return more than one row. A query that ends in a single `AVG`, `COUNT` or `SUM` with no `GROUP BY` always returns one. A query that picks rows by a town or a species usually returns several, so it needs `IN`.

## A query as a table

A query's result has columns and rows, like a table, so it can stand after `FROM`. This is how you take an average of totals. How many treatments does a visit have on average?

```sql
SELECT ROUND(AVG(n), 2) AS treatments_per_visit
FROM (
  SELECT visit_id, COUNT(*) AS n
  FROM treatments
  GROUP BY visit_id
) AS per_visit;
```

The inner query makes one row per visit with its count. The outer query averages those counts. Written as `AVG(COUNT(*))` in one query, SQLite says `misuse of aggregate function COUNT()`: one query cannot total and then average its totals. Give the inner query a name with `AS`, so that its columns can be named as `per_visit.n` when you need to.

## Join or subquery

Many questions can be written either way. The vaccine query above, written as a join, returns the same five animals:

```sql
SELECT a.name, a.species
FROM animals AS a
JOIN visits AS v ON v.animal_id = a.id
WHERE v.reason LIKE '%vaccine%';
```

A join says it more plainly when the result needs columns from both tables, such as the animal's name beside the visit's date: a query inside `WHERE` can only choose rows, not add columns. A subquery says it more plainly when the other table only decides which rows to keep. It also keeps each row once: a join repeats an animal for every matching visit, so an animal with two vaccine visits would come back twice, while `IN` only asks whether its id is in the list.

## Your work in this issue

Four files in `queries/`, one task each. Build each one from the inside out: write the inner query alone, run it with `node run.mjs` and the file's name, and check its rows, then put it in brackets inside the outer query. Then press Check. It compares the columns and the rows on the data you can see and on hidden data, whose average weight and Fernlea owners are different.
