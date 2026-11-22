# Bookings and places left

## What you will be able to do

The workshops now live in the database and stay there. Places are still booked on the paper sheet by the door, and nobody can tell from the page whether a workshop is nearly full. In this issue bookings get a table of their own, tied to the workshops table, and the database counts what is left. By the end you will be able to:

- make a table whose rows point at rows of another table, and let the database guard that link
- add a row only when the row it points at is there
- join two tables, keeping the rows that have no partner
- count per group with `COUNT` and `GROUP BY`, and do arithmetic in a query

## The request from Dilys

Dilys owns Kilnworth. She stops by the desk with the paper sheet in her hand.

> **Dilys:** Last Saturday we had fourteen names on a sheet for twelve places, and two families drove an hour for nothing. I want people to book on Ivo's page, and I want the page to show how many places are left, worked out from the bookings themselves, not a number someone keeps up to date by hand.

The route is ready: `POST /bookings` in `src/routes/bookings.js` takes `{ workshopId, name }` from anyone, outside the staff check, and calls `store.book`. You write the table, `book`, and the places left.

## A table that points at another

A booking belongs to one workshop, so it stores that workshop's id. Here is the same idea for a studio's members and their visits:

```sql
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY,
  memberId INTEGER NOT NULL REFERENCES members (id),
  day TEXT NOT NULL
)
```

`REFERENCES members (id)` makes `memberId` a **foreign key**. The database now refuses a visit whose `memberId` is not the id of a member, with `FOREIGN KEY constraint failed`. It also refuses to delete a member that visits still point at, so a link can never be left hanging. `node:sqlite` switches this check on for every database it opens.

That second refusal matters for the studio: removing a workshop that people have booked now fails. The `DELETE` route in `src/routes/workshops.js` catches that refusal and answers 409, "people have booked this workshop", instead of a 500.

`db.exec` can run several statements at once, separated by `;`, so both tables can be made in one call.

## Adding a row that points somewhere

Before you add a booking, find out whether its workshop is there, and say so if it is not. `book` returns an object that says how it went, and the route turns it into a status:

```js
return { booking: { id, workshopId, name } } // 201
return { problem: 'not_found' } // 404
```

Do not let the database's refusal reach the error handler: a visitor who asks for a workshop that does not exist made a mistake, and a 500 says the server did.

## Joining two tables

To count each workshop's bookings, you need rows from both tables side by side. A `JOIN` pairs each row of one table with the rows of the other that match the `ON` condition:

```sql
SELECT m.id, m.name, v.day
FROM members AS m
LEFT JOIN visits AS v ON v.memberId = m.id
```

`AS m` gives the table a short name. Once two tables are in a query, a column that both have, such as `id`, has to say which table it means: `WHERE id = ?` fails with `ambiguous column name: id`, and `WHERE m.id = ?` works.

A plain `JOIN` keeps only the pairs it finds, so a member with no visits drops out of the answer completely. `LEFT JOIN` keeps every row of the left table, and fills the right side with `NULL` when there is no match. A workshop nobody has booked yet still belongs on the page.

## Counting per group

`COUNT` adds rows up, and `GROUP BY` says what to add them up per:

```sql
SELECT m.id, m.name, COUNT(v.id) AS visits
FROM members AS m
LEFT JOIN visits AS v ON v.memberId = m.id
GROUP BY m.id
```

Without `GROUP BY`, `COUNT` turns the whole answer into one row. With it, you get one row per member.

Look at what is counted. A member with no visits still has one row in the join, with `NULL` on the visits side. `COUNT(*)` counts rows, so it says 1. `COUNT(v.id)` counts only values that are not `NULL`, so it says 0.

A query can also do arithmetic with columns, and name the result with `AS`: `m.allowance - COUNT(v.id) AS visitsLeft`. The rows then come back with a `visitsLeft` field, worked out by the database in the same trip.

A `WHERE` goes before `GROUP BY`, and `ORDER BY` after it.

## Your work in this issue

Start in `src/db.js`: add the bookings table to `createTables`. Then write `book` in `src/store.js`, and last change `list` and `get` so every workshop comes with `placesLeft`. The filters keep working.

Run `node try.js` after each task. It books two places on the family morning and one on a workshop that does not exist, then reads the family morning and the Thursday list. Each run adds two more bookings to `data/kilnworth.db`, so the places left go down; delete the `data` folder to start over.
