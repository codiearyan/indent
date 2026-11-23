# Making a query fast

## What you will be able to do

Every query you have written gives the right rows. This issue is about how SQLite finds them. Without help it reads every row of a table, which is fine for twenty animals and slow for twenty years of visits. An index lets it go straight to the rows it needs, at a price. By the end of it you will be able to:

- read a query plan with `EXPLAIN QUERY PLAN`, and tell a search from a scan
- make an index with `CREATE INDEX` and see the plan change
- make an index on two columns in the order that helps
- say what an index costs, and remove one that nothing uses

## The request from Winnie

> **Winnie:** The practice is taking on the records of the clinic in Fernlea, years of them. I look up the visits of one day all the time, Ifan and Mabel look at their own visits every morning, and we find an owner's animals a dozen times a day. Rosamund heard that something called an index makes that quick, but also that we have one nobody uses.

## Reading a plan

Put `EXPLAIN QUERY PLAN` in front of a query, and SQLite says how it would run it instead of running it:

```sql
EXPLAIN QUERY PLAN SELECT phone FROM owners WHERE last_name = 'Okoro';
```

```
SCAN owners
```

`SCAN owners` means it reads every row of `owners` and keeps the ones that match. Look up an owner by id instead and the plan says `SEARCH owners USING INTEGER PRIMARY KEY (rowid=?)`: `SEARCH` means it goes straight to the rows it needs, here through the table's key. A join has one line per table, in the order SQLite visits them, for example `SCAN v` and then `SEARCH t USING INDEX treatments_by_visit (visit_id=?)`: every visit is read, and for each one its treatments are found directly. A line such as `SCAN a USING COVERING INDEX animals_by_name` is still a scan: SQLite reads every entry of that index instead of every row of the table, which saves little, because the index is not in the order the search needs.

The tables here are small, so every query is quick and you will not feel the difference. The plan shows what would happen with fifty thousand rows, and it is what Check reads. It never times anything.

## Making an index

An index is like the index at the back of a book: the values of a column in order, each with a pointer to its row. To find a value, SQLite looks it up in the order instead of reading every row.

```sql
CREATE INDEX owners_by_last_name ON owners (last_name);
```

After `CREATE INDEX` comes a name of your own, then `ON`, the table, and in brackets the column. Now the plan for the same query says `SEARCH owners USING INDEX owners_by_last_name (last_name=?)`. The brackets say what the index is used for. A range uses it too: `last_name >= 'M'` shows as `(last_name>?)`, and a `BETWEEN` as `(last_name>? AND last_name<?)`.

An index only helps a search on its own table and column. An index on `last_name` does nothing for a search by town. Make a second index with a name that is taken and SQLite says `index owners_by_last_name already exists`. `CREATE UNIQUE INDEX` makes an index that is also a rule: no two rows may share a value, and it cannot be made at all while two rows already do.

## An index on two columns

An index can hold two columns, ordered by the first, then by the second within each value of the first, the way a phone book is ordered by last name and then by first name.

```sql
CREATE INDEX owners_by_town_and_name ON owners (town, last_name);
```

A search for one town and the names from M on now says `(town=? AND last_name>?)`: all the owners of Larkhill sit together, in name order, so both parts of the search use it. The order of the columns matters. The same index does nothing for a search by last name alone, just as a phone book ordered by town would not help you find every Okoro. Put first the column the search compares with `=`, and the range second. Two separate indexes on one column each do not add up: SQLite uses one index for each table in a search.

## What an index costs

An index is not free. It takes room, and every `INSERT`, `UPDATE` and `DELETE` on its table has to change the index too. So an index is worth having when a query the practice runs uses it, and only then. `DROP INDEX owners_by_last_name;` removes one; the table and its rows stay.

Not every search can use an index. A `LIKE` pattern that starts with `%` asks for a value that ends a certain way, and an order by first letters is no help with that, so the plan says `SCAN` whatever indexes there are.

## Your work in this issue

Four files in `queries/`, one task each. In each, write your `CREATE INDEX` or `DROP INDEX`, and an `EXPLAIN QUERY PLAN` line to read the plan before and after. Run the file with `node run.mjs` and the file's name; it makes a fresh copy of the database every time and prints each plan. Then press Check. It runs only your `CREATE INDEX` and `DROP INDEX` statements on its own fresh copy, and asks SQLite for the plans of searches of its own.
