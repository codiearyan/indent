# Rows with no match

## What you will be able to do

In the last issue every row found its partner: every animal has an owner, every treatment a visit. It does not always work that way. A new owner may have no animal in the records yet, an animal may never have come in, a visit may have nothing on its bill. A plain join leaves those rows out without a word, and in this issue you learn to keep them, and to find them. By the end of it you will be able to:

- say which rows a plain `JOIN` leaves out, and why that is easy to miss
- keep every row of one table with `LEFT JOIN`, and read the `NULL` it puts where a partner is missing
- find the rows that have no partner at all
- tell a missing row from a row that holds 0

## The request from Rosamund

> **Rosamund:** I did the Christmas cards from your list of owners and their animals, and Nia Calloway was not on it. She signed up this week and her kitten has not come in yet, but she is ours all the same. Ifan wants the animals we have never seen, so he can invite them for a first check. And I want the visits nothing was charged for. Some checks are meant to be free, but I want to see them all.

## A plain JOIN drops rows

Here is the list Rosamund used, owners joined to their animals:

```sql
SELECT o.first_name, o.last_name, a.name
FROM owners AS o
JOIN animals AS a ON a.owner_id = o.id;
```

It gives 22 rows, one per animal, and Nia is not among them. A `JOIN` keeps only the pairs that `ON` finds, and no animal has Nia's id in its `owner_id`, so there is no pair with Nia in it, and no row. Nothing warns you. The result looks complete, and the owner who is missing is the one you were not looking for.

This kind of join, the one you have written so far, is called an inner join. `INNER JOIN` and `JOIN` are the same thing.

## LEFT JOIN keeps every row

`LEFT JOIN` keeps every row of the table named before it, the left one, whether it finds a partner or not. Where it finds none, the columns of the other table are `NULL` on that row:

```sql
SELECT a.name, v.visit_date, v.reason
FROM animals AS a
LEFT JOIN visits AS v ON v.animal_id = a.id;
```

Every animal is in this result. Pepper has two visits, so she has two rows. Rolo has never come in, so he has one row with `NULL` as the date and the reason. A `NULL` here does not mean an empty cell in the data: it means there was no row to take the value from.

Now the order of the tables matters. `FROM visits LEFT JOIN animals` keeps every visit, which is not the same question. Put first the table whose rows must all be there. You may also meet `LEFT OUTER JOIN`, which is the same as `LEFT JOIN`.

## Finding the rows with no partner

Once the rows with no partner are kept, they are easy to pick out: they are the rows where the other table's columns are `NULL`. So a `WHERE` keeps only those:

```sql
SELECT o.first_name, o.last_name
FROM owners AS o
LEFT JOIN animals AS a ON a.owner_id = o.id
WHERE a.id IS NULL;
```

That gives Nia, the one owner with no animal. Use `IS NULL`, as the issue about missing values taught: `= NULL` is never true.

Choose the column you test with care. Test one that is never empty in a real row of the other table, like its `id`. Had you tested `a.breed IS NULL`, you would also get every owner whose animal has an unknown breed, because that cell is empty too, and nothing in the result would tell the two apart.

## Nothing is not zero

A missing row and a row that holds 0 are different things. Bear's weight check cost £0: there is a row in `treatments` for it, with 0 as the price. A visit with nothing charged has no row in `treatments` at all. A query looking for visits with no partner must find the second kind and leave Bear's visit alone. A test like `price = 0` finds the first kind, and a plain join never sees the second.

## Your work in this issue

Three files in `queries/`, one task each. Run each with `node run.mjs` and the file's name, and look for the row a plain join would lose: Nia, an animal that never came in, a visit with no bill. Then press Check. It compares the columns and the rows on the data you can see and on hidden data, which has other owners, animals and visits with no partner.
