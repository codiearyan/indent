# Write, change and remove rows

## What you will be able to do

The API now reads every workshop from `data/kilnworth.db`. Changes still go nowhere: the store's `create`, `update` and `remove` throw. In this issue you write them, and the week's changes finally outlive a restart. By the end you will be able to:

- add a row with `INSERT` and get back the id the database gave it
- change some columns of a row with `UPDATE` and keep the others
- remove a row with `DELETE`
- tell from the result of `run()` whether a statement really changed anything

## The request from Sunniva

Sunniva has been waiting for this one.

> **Sunniva:** The new raku evening, the family morning going up to fourteen, glazing basics off the page: I want to do those at the desk once and have them stay. And if I change a workshop someone else just removed, tell me it is gone. Don't pretend it worked.

The routes are ready. `POST` calls `create`, `PUT` and `PATCH` call `update`, and `DELETE` calls `remove`. `PUT`, `PATCH` and `DELETE` now answer 404 when the store says no row was there, so the store has to know.

## Adding a row

`INSERT` names the columns and leaves a `?` for each value:

```js
const result = db
  .prepare('INSERT INTO members (name, town, joinedYear) VALUES (?, ?, ?)')
  .run(name, town, joinedYear)
// { changes: 1, lastInsertRowid: 12 }
```

`run()` is for statements that change things instead of giving rows back. Its result says two things: `changes`, how many rows the statement added, changed or removed, and `lastInsertRowid`, the id of the row an `INSERT` just added.

Leave `id` out of the columns. An `INTEGER PRIMARY KEY` picks the next free number by itself, and `lastInsertRowid` tells you which one it picked. Reading the new row back by that id gives you exactly what was stored.

## Changing a row

`UPDATE` sets columns on the rows its `WHERE` matches:

```js
db.prepare('UPDATE members SET town = ? WHERE id = ?').run('Kirkby', 12)
```

Forget the `WHERE` and every row in the table gets the new town. Same for `DELETE`. Read those statements twice before you run them.

A `PATCH` sends only some fields, and the others must stay as they are. One way is to write `SET` for every column but let a missing value keep the old one. `COALESCE(a, b)` gives back `a`, or `b` when `a` is `NULL`:

```js
db.prepare(
  'UPDATE members SET town = COALESCE(?, town), joinedYear = COALESCE(?, joinedYear) WHERE id = ?'
).run(fields.town ?? null, fields.joinedYear ?? null, id)
```

A field that was not sent is `undefined` in JavaScript, which SQLite cannot store, so `?? null` turns it into `NULL`, and `COALESCE` then keeps what the column already holds. This works here because no column may be `NULL` anyway, and the route has already refused a body that sends `null`. Another way is to build the `SET` list from the fields that were sent, the way you built the `WHERE` of the filters: column names from your own list, values in their own list.

The values go in the order of the question marks, the id last because its `?` is last.

## Removing a row

```js
db.prepare('DELETE FROM members WHERE id = ?').run(12)
```

When the row is gone, it is gone. There is no undo, which is why the desk needs a staff key.

## Did anything change?

Here is the question Sunniva asked. When nobody has the id, `UPDATE ... WHERE id = ?` matches nothing. That is not an error: SQLite runs it happily and changes zero rows. The same goes for `DELETE`.

So the answer is in `changes`:

```js
const { changes } = db.prepare('DELETE FROM members WHERE id = ?').run(id)
if (changes === 0) {
  // no row had that id
}
```

You could ask first with a `SELECT` and then change the row, but that is two trips to the database, and the result of the change already says what happened. Let the change report on itself.

`changes` counts the rows the `WHERE` matched, even when the new values were the same as the old ones. A `PUT` that sends a workshop back unchanged still counts as one row changed, and that is the answer you want: the workshop is there.

## Your work in this issue

Everything is in `src/store.js`. Write `create`, then `update`, then `remove`. `list` and `get` are there from the last issue; use `get` to read a row back after you change it.

Run `node try.js` after each task. It adds a workshop, restarts the API on the same file, reads the workshop back, changes it and removes it twice. When everything works the second removal answers 404, and the file ends as it began.
