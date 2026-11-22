# Lists, patterns and ranges

## What you will be able to do

You can keep rows with `=`, `<`, `>`, `AND` and `OR`, and that already answers most questions. Some questions are clumsy that way, though: "is it one of these five things", "does the name contain this word", "is the date somewhere in this month". SQL has a short way to ask each. By the end of this issue you will be able to:

- test whether a value is one of a list, with `IN` and `NOT IN`
- match text against a pattern, with `LIKE`
- test whether a value falls in a range, with `BETWEEN`
- compare dates that are stored as text

## The request from Rosamund

Rosamund Ashdown owns the practice and does the accounts on Friday afternoons.

> **Rosamund:** The vaccine and test suppliers both put their prices up, so I need to see what we charge for those. Ifan wants every terrier for a skin check, however the breed was typed in. I need October's visits for the monthly report. And Mabel keeps asking which of our patients are something other than a dog, a cat or a rabbit.

## One of a list: IN

`IN` is true when a value is any one of a list in brackets:

```sql
SELECT vet, reason
FROM visits
WHERE reason IN ('Limping', 'Ear infection');
```

It means exactly the same as `reason = 'Limping' OR reason = 'Ear infection'`, only shorter, and it stays short when the list grows to five or ten values. The values are separated by commas, and text values each sit in their own single quotes.

`NOT IN` turns it around: it is true when the value is none of the list. `WHERE reason NOT IN ('Limping', 'Ear infection')` keeps every other visit.

## Matching a pattern: LIKE

`=` compares whole values. `LIKE` compares a value with a pattern, in which two characters have a special meaning:

- `%` stands for any run of characters, including none at all
- `_` stands for exactly one character

So `email LIKE '%@mail.example'` keeps every email that ends in `@mail.example`, whatever comes before it. `first_name LIKE '_wen'` keeps four-letter names that end in "wen". Where you put the `%` decides what you are asking: `'B%'` means "starts with B", `'%ly'` means "ends with ly", and `'%cross%'` means "has cross somewhere in it", at the start, in the middle or at the end.

Here SQLite differs from `=` and from some other databases: `LIKE` ignores letter case for the plain letters A to Z. `name LIKE 'b%'` finds Biscuit and Bramble, while `name = 'biscuit'` finds nothing. That makes `LIKE` the tool when you do not know how a value was typed in. A `LIKE` with no `%` or `_` in it matches whole values, like `=`, but still ignores letter case.

## A range: BETWEEN

`BETWEEN` is true when a value falls from one limit to another, both limits included:

```sql
SELECT name, price
FROM treatments
WHERE price BETWEEN 40 AND 52;
```

That keeps a price of exactly 40 and a price of exactly 52, and everything in between. It means the same as `price >= 40 AND price <= 52`. The smaller limit comes first; the other way round, nothing matches.

## Dates are text here

SQLite has no separate kind of value for dates. In this database every date is text in the shape year, month, day: `2026-10-15`. That shape was chosen on purpose, because text compares character by character from the left, so the year is compared first, then the month, then the day. As a result, comparing these dates as text gives the same answer as comparing them as dates, and `<`, `>` and `BETWEEN` work on them:

```sql
SELECT name, born
FROM animals
WHERE born BETWEEN '2020-01-01' AND '2020-12-31';
```

That finds the animals born in 2020. Mind the quotes, since the dates are text, and mind the limits: both are included, so the last day goes in as the upper limit. A date with the month or day written as one digit, like `2026-9-5`, would break the trick, which is why the database always writes two.

## Your work in this issue

Four files in `queries/`, one task each. Each comment names the columns and the rows to keep. Write each query, run it with `node run.mjs` and the file's name, and check the rows near the edges: a value right on a limit, a word at the start of a breed and at the end. Then press Check. Check runs your query on the data you can see and on hidden data, which holds values your data does not, so a list copied from the rows you can see will not pass where a rule is asked for.
