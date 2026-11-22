# Choosing rows

## What you will be able to do

So far every query has returned every row of its table. Real questions are narrower: not every animal, only the cats; not every owner, only the ones outside the village. In this issue you tell SQLite which rows to keep. By the end of it you will be able to:

- keep only the rows that match a condition, with `WHERE`
- compare text and numbers with `=`, `<>`, `<`, `>`, `<=` and `>=`
- join two conditions with `AND` and `OR`, and turn one around with `NOT`
- use brackets so a mixed condition means what you meant

## The request from Ifan

Ifan Pryce heard that the new developer can now ask the database things, and comes to the front desk between two appointments.

> **Ifan:** I have a list of things I keep meaning to look up. The cats, for the new flea treatment. Which dogs need the big scales. Who lives outside Hollybank, because I do home visits out there on Thursdays. And the rabbits and guinea pigs that might be too light, so we can call them in.

## Keeping rows with WHERE

`WHERE` comes after `FROM` and holds a condition. SQLite tests the condition on every row and keeps only the rows where it is true:

```sql
SELECT name, price
FROM treatments
WHERE kind = 'vaccine';
```

The column names after `SELECT` and the condition after `WHERE` are separate choices. You can test a column you do not show, as `kind` is here.

Text you compare with goes in single quotes, as in the last issue. Leave the quotes out and SQLite takes the word for a column name: `kind = vaccine` gives `no such column: vaccine`. Numbers take no quotes: `price = 52`.

In SQLite, `=` compares text exactly, capital letters included. `kind = 'Vaccine'` returns no rows at all, with no error, because every kind in the table is stored in lower case. When a query returns nothing and you expected rows, look at the spelling and the capital letters of your text first. Some other databases ignore letter case here; SQLite does not.

## Comparing

Six comparisons cover almost everything:

| Write  | It means                 |
| ------ | ------------------------ |
| `=`    | is equal to              |
| `<>`   | is not equal to          |
| `<`    | is less than             |
| `>`    | is more than             |
| `<=`   | is less than or equal to |
| `>=`   | is more than or equal to |

SQLite also accepts `!=` for "not equal". The difference between `>` and `>=` is the row right on the limit: `price > 45` leaves out a treatment that costs exactly 45, and `price >= 45` keeps it. Read the question carefully: "more than" and "at least" are different questions.

## Two conditions: AND and OR

`AND` joins two conditions that must both be true:

```sql
SELECT name, price
FROM treatments
WHERE kind = 'medicine' AND price > 20;
```

That keeps medicines that cost more than 20, and nothing else. `OR` keeps a row when either condition is true, or both:

```sql
SELECT vet, reason
FROM visits
WHERE reason = 'Limping' OR reason = 'Ear infection';
```

A common slip is reaching for `AND` when the question says "and" in everyday words. "The limping visits and the ear infections" means two groups of rows, and a single row cannot have both reasons at once. That is `OR`.

`NOT` in front of a condition turns it around: `NOT kind = 'consultation'` keeps every row whose kind is anything else. It means the same as `kind <> 'consultation'`, so use whichever reads better to you.

## Mixing AND and OR

When one condition has both `AND` and `OR`, SQLite works out the `AND` first, just as a calculator works out `2 + 3 * 4` by doing the times first. Look at this one:

```sql
WHERE kind = 'vaccine' OR kind = 'test' AND price > 60
```

It reads as "vaccines, or tests over 60", so every vaccine is kept whatever it costs. If the question was "vaccines or tests, but only the ones over 60", that is wrong, and SQLite gives no error. Brackets fix it, because SQLite works out what is inside them first:

```sql
WHERE (kind = 'vaccine' OR kind = 'test') AND price > 60
```

Whenever a condition mixes `AND` and `OR`, put brackets around the part that belongs together, even when you think you do not need them. The next person to read it will thank you.

## Your work in this issue

Four files in `queries/`, one task each. Each comment says which columns to return and which rows to keep. Write the query, run it, for example with `node run.mjs queries/1-cats.sql`, and read the rows: is every row one the question asks for, and is any row missing? Then press Check. Check runs your query on the data you can see and on hidden data with other animals and owners, so a condition that names the rows you happen to see, like a list of their ids, will not pass. The order of rows does not matter in this issue.
