# Missing values

## What you will be able to do

Since your first query you have seen `NULL` in the results: an owner with no email, a cat nobody has weighed, a visit with no notes. Real records are full of gaps like these, and they behave differently from every other value. Ignore that and a query quietly loses rows without any error. This issue is about getting the gaps right. By the end of it you will be able to:

- say what `NULL` is, and what it is not
- find missing values with `IS NULL`, and skip them with `IS NOT NULL`
- spot the conditions that drop rows with a missing value, and keep those rows when you need them
- fill a gap with another value, using `COALESCE`

## The request from Winnie

> **Winnie:** Rosamund wants to send the vaccine reminders by email this year, so I need to phone everyone we have no email for and ask. Ifan wants to read back through the visits he wrote notes on. He also asked for every dog that is not a Labrador, and he was very clear that the dogs nobody knows the breed of count too. And could I have one list with a way to reach each owner, email if we have it, phone if not?

## What NULL is

`NULL` means that no value was recorded. It is not zero, and it is not empty text. A cat with a weight of `0` would weigh nothing; a cat with a weight of `NULL` has a weight nobody wrote down. That is why SQL treats it as unknown.

An unknown value cannot be equal to anything, not even to another unknown. So a comparison with `NULL` is never true:

```sql
SELECT name, weight_kg
FROM animals
WHERE weight_kg = NULL;
```

This runs without an error and returns no rows, even though some animals have no weight. Nothing tells you the query is wrong, which is what makes this mistake so common. `<> NULL` has the same problem: it is never true either. Testing for empty text with `= ''` does not help, because the cells hold `NULL`, not empty text.

## IS NULL and IS NOT NULL

SQL has a separate test for a missing value:

```sql
SELECT name, born
FROM animals
WHERE born IS NULL;
```

That returns the animals whose birthday nobody knows. `IS NOT NULL` is the opposite and keeps only the rows where a value was recorded. These two are the only comparisons that give a plain yes or no for an empty cell. SQLite also accepts the shorter `ISNULL` and `NOTNULL`, but the two-word forms work in every database.

## Conditions skip empty cells quietly

Because a comparison with `NULL` is never true, every ordinary condition leaves out the rows where that column is empty. Most of the time that is what you want. Sometimes it is not:

```sql
SELECT name, weight_kg
FROM animals
WHERE weight_kg < 5;
```

This looks like "every animal under 5 kg", and the animals nobody has weighed are missing from it. Whether they belong depends on the question. If they do, say so out loud in the condition:

```sql
WHERE weight_kg < 5 OR weight_kg IS NULL
```

The same thing happens with `<>`. "Every visit not seen by Ifan" written as `vet <> 'Ifan Pryce'` would drop a visit with no vet recorded. Whenever a condition tests a column that can be empty, ask yourself where the empty rows should go. And when the extra `OR` meets an `AND`, remember the brackets from the issue about choosing rows.

## Filling a gap: COALESCE

Sometimes you do not want to drop or find the gaps, you want to fill them. `COALESCE` takes a few values and gives back the first one that is not `NULL`:

```sql
SELECT reason, COALESCE(notes, 'no notes') AS notes
FROM visits;
```

A visit with notes shows them; a visit without shows `no notes`. The values can be columns or text you type, and there can be more than two: `COALESCE(a, b, c)` tries `a`, then `b`, then `c`. SQLite also has `IFNULL(a, b)`, which does the same for exactly two values.

Remember too that a gap spreads through anything worked out from it. `'Breed: ' || breed` is `NULL` for an animal with no breed, not `Breed: ` followed by nothing. `COALESCE` around the column is the usual fix.

## Your work in this issue

Four files in `queries/`, one task each. Run each query with `node run.mjs` and the file's name and look hard at the `NULL` cells in the output: is every row with a gap where the question wants it? Then press Check. Check runs your query on the data you can see and on hidden data, which has gaps in other places.
