# Totals across tables

## What you will be able to do

You can join two tables, keep the rows that have no partner, count and total, and group. This issue puts those together. A question like "how many visits have each owner's animals had" crosses three tables and ends in a count per group, and each step can go wrong without an error. By the end of it you will be able to:

- join three tables in one query
- count or total per owner or per animal across a join, the ones with none included
- spot a count that counts the same thing twice, and fix it
- say whether a condition belongs in `WHERE` or in the `ON` of a `LEFT JOIN`

## The request from Rosamund

> **Rosamund:** Winnie rings the owner of every animal that came in this month, so she needs the date, the animal and a number to call. For the yearly review I want each owner with how many animals they have, the ones with none too. Ifan wants each animal's number of visits and what they came to. And the dog food supplier wants to know how many dogs each owner has, with a 0 for the owners who have none.

## Three tables in one query

A treatment knows its visit, and a visit knows its animal, so a treatment reaches its animal in two steps. Each step is one `JOIN` with its own `ON`:

```sql
SELECT t.name AS treatment, a.name AS animal
FROM treatments AS t
JOIN visits AS v ON t.visit_id = v.id
JOIN animals AS a ON v.animal_id = a.id;
```

SQLite joins the first two tables, then joins the third to that result. The second `ON` can use any table that came before it. The result has two columns called `name` in the tables, so each one gets its own name with `AS`. Leave one `ON` out and that step pairs every row with every row again, and the rows multiply.

## Counting across a join

Here is every owner with how many visits their animals have had, the owners with no animals included:

```sql
SELECT o.first_name, o.last_name, COUNT(v.id) AS visits
FROM owners AS o
LEFT JOIN animals AS a ON a.owner_id = o.id
LEFT JOIN visits AS v ON v.animal_id = a.id
GROUP BY o.id, o.first_name, o.last_name;
```

Three things in it matter. First, both joins are `LEFT JOIN`. Once a row may have no partner, a plain `JOIN` after it drops that row again, since its columns are `NULL` and match nothing.

Second, the count is `COUNT(v.id)`, not `COUNT(*)`. Nia has one row after the joins, with `NULL` in every column of `animals` and `visits`. `COUNT(*)` counts rows, so it gives her 1. `COUNT(v.id)` skips empty cells, as the issue about counts taught, so it gives her 0. The same goes for Carys: Rolo has never come in, and `COUNT(*)` would count his empty row as a visit.

Third, the groups. Two owners can share a name, so a group made from names alone can hold two people. Group by the owner's `id`, which is different for every owner, and list the name columns after it too, so every plain column in the list is one you grouped by.

## Counted twice

A join repeats a row once for every partner it finds. Pepper's visit on 30 September had two treatments, so after joining visits to treatments that one visit is two rows. Count those rows and you count the visit twice:

```sql
SELECT v.vet, COUNT(*) AS visits
FROM visits AS v
JOIN treatments AS t ON t.visit_id = v.id
GROUP BY v.vet;
```

This says Ifan saw 13 visits. He saw 10. What it counted were treatments. `COUNT(DISTINCT v.id)` counts each visit once, however many rows it fills, and gives 9: still one short, because the plain join dropped his free visit, which has no treatment at all. With a `LEFT JOIN` it gives 10.

`DISTINCT` mends a count, not a sum. When a join repeats a price on two rows, a total adds it twice, and nothing tells a repeat from a second charge of the same amount. So before you total a column, check that each value appears on one row of the joined result only.

## WHERE or ON

In a `LEFT JOIN` the two places for a condition do different things. Say you want every animal with its visits from Ifan:

```sql
SELECT a.name, v.visit_date
FROM animals AS a
LEFT JOIN visits AS v ON v.animal_id = a.id AND v.vet = 'Ifan Pryce';
```

With the test in `ON`, it only decides which visits count as partners. Every animal stays, and an animal Ifan never saw has `NULL` as its date. Move the test to `WHERE` and it runs after the join, on every row. An animal with no visit from Ifan has `NULL` as its vet, the test is not true, and the animal is gone: the `LEFT JOIN` has quietly become a plain one. So a condition about which partners to pair goes in `ON`, and a condition about which rows of the result to keep goes in `WHERE`.

## Your work in this issue

Four files in `queries/`, one task each. Run each with `node run.mjs` and the file's name, and check one owner or one animal by hand in `seed.sql`, ideally one with no partner or one with several. Then press Check. It compares the columns and the rows on the data you can see and on hidden data, which has two owners with the same name and two animals with the same name.
