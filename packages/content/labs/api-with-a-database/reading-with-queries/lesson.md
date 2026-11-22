# Read workshops with queries

## What you will be able to do

The studio's workshops now live in `data/kilnworth.db`, made and filled once by `openDatabase`. The API does not read that file yet. In this issue the store stops looking in memory and asks the database instead, for the list, for one workshop and for the filters. By the end you will be able to:

- read many rows with `.all()` and one row with `.get()`
- ask for rows in an order, and for one row by its key
- build a query whose conditions depend on what was asked, with every value passed as a value
- let the database pick the rows instead of sorting through them in JavaScript

## The request from Ivo

Ivo Pernell builds the sign-up page. He heard the plan from Sunniva.

> **Ivo:** Moving onto a database is fine by me, as long as my page doesn't notice. The list, one workshop by its id, and the day and top price filters should answer exactly as they do now.

So the routes stay as they are. `createApp` now opens the database and hands it to `createStore(db)` in `src/store.js`, and the routes call the same `list` and `get` as before. Only what is inside those two changes.

## Rows come back as objects

A `SELECT` names the columns it wants and the table they come from. `.all()` runs it and gives back an array with one object per row:

```js
const rows = db.prepare('SELECT id, name, town FROM members ORDER BY name').all()
// [{ id: 3, name: 'Ama', town: 'Tollan' }, { id: 1, name: 'Bea', town: 'Kirkby' }]
```

`ORDER BY` says the order. Leave it out and the rows usually come back in the order they were stored, but nothing promises that, and it can change as the table grows. A list someone reads should ask for its order.

Each row's keys are the column names. When you log a row, Node shows it as `[Object: null prototype] { id: 3, ... }`. That only means the object has no `toString` and friends of its own; `res.json(rows)` sends it like any other object.

## One row

To read one row, compare its key in a `WHERE` and use `.get()`:

```js
const findMember = db.prepare('SELECT id, name, town FROM members WHERE id = ?')
findMember.get(3) // { id: 3, name: 'Ama', town: 'Tollan' }
findMember.get(99) // undefined
```

`.get()` gives back the first matching row, or `undefined` when nothing matches. That `undefined` is exactly what the route already turns into a 404. `.all()` would give back an array, and an empty array is still truthy, so the route would never see "missing".

The id goes in the place of the `?`, like every value. Turning it into a number first does not make it safe to write into the text: it is still a value, and the checks look for it in your SQL.

## Conditions that depend on the question

A filter is a condition that is only there when someone asked for it. Build two lists side by side: the pieces of SQL, written in your own code, and the values that go with them.

```js
function findMembers({ town, joinedAfter }) {
  const conditions = []
  const values = []
  if (town !== undefined) {
    conditions.push('town = ?')
    values.push(town)
  }
  if (joinedAfter !== undefined) {
    conditions.push('joinedYear > ?')
    values.push(joinedAfter)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return db.prepare(`SELECT id, name FROM members ${where} ORDER BY id`).all(...values)
}
```

This joins text, but only text you wrote yourself: `'town = ?'` never changes, whatever the visitor sent. The visitor's values only ever go into `values`, and `...values` hands them over in the order of the question marks.

Test for a filter with `!== undefined`, not with `if (joinedAfter)`. A value of `0` is falsy in JavaScript, and "costs at most 0 cents" is a real question.

SQLite cannot store `undefined`. Hand it one and it throws `Provided value cannot be bound to SQLite parameter 1`. A filter that was not given should leave out its condition and its value together.

## Let the database pick

You could fetch every row and filter with `.filter()` in JavaScript, and the answer would look the same. The database is built for this: it can skip the rows that do not match without sending them to you, and with an index it does not even read them. When a table has thousands of bookings and you want one person's, that is the difference between a quick answer and a slow page. The checks count the rows your query gives back, and they should be only the ones in the answer.

## Your work in this issue

Everything is in `src/store.js`. Write `list` without filters first, then `get`, then add the two filters to `list`. The store's other methods throw for now; changing workshops comes in the next issue.

Run `node try.js` after each task. It starts the API on `data/kilnworth.db` and sends the list, two single workshops and two filtered lists.
