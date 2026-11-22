# All or nothing

## What you will be able to do

People book on Ivo's page now, and every workshop shows its places left. Nothing stops a booking when none are left, though, and families have started booking one name at a time. In this last issue the database learns to say no, and to treat several changes as one. By the end you will be able to:

- refuse a change when the data says it cannot happen
- decide about a whole group of changes before making any of them
- group statements in a transaction with `BEGIN`, `COMMIT` and `ROLLBACK`
- undo a half-done change when something fails, and still report the failure

## The request from Kofi

Kofi teaches most of the studio's classes. He writes after a busy Saturday.

> **Kofi:** The family morning showed zero places, and three more names still got through. And a family of four booked when two places were left: two of them got in, the others didn't, and they all went home. A family is one booking to me. Either everyone has a place or nobody does.

The routes are ready. `POST /bookings` now answers 409 when `book` says `{ problem: 'full' }`, and `POST /bookings/group` takes `{ workshopId, names }` and calls `bookGroup`.

## Saying no

A full workshop is not an error in the code; it is an answer. Read the places left, and when there are none, return the problem without adding anything. The order matters: a booking added first and checked after has already happened.

Could another request slip in between your check and your insert? Not in this server. `node:sqlite` runs each statement to the end before your next line runs, and Node runs one request's code at a time, so a route with no `await` in it finishes before the next request starts. In a bigger system, with several servers sharing one database, you would let the database decide in one statement, or with the transactions below.

## A group is one decision

Booking a group one name at a time with `book` gives exactly the problem Kofi saw: the first names go in, then the workshop is full, and the rest are refused. Decide about the whole group before the first booking: if the places left are fewer than the names, refuse the group and add nothing.

## Transactions

Checking first covers the case you can see coming. It does not cover the database failing halfway: a full disk, a lost connection, a bug in the third insert. After the first two bookings have gone in, the group is half booked.

A **transaction** makes several statements one change. You start it, run the statements, and then either keep all of them or none:

```js
db.exec('BEGIN')
db.prepare('UPDATE cards SET credits = credits - ? WHERE memberId = ?').run(5, from)
db.prepare('UPDATE cards SET credits = credits + ? WHERE memberId = ?').run(5, to)
db.exec('COMMIT')
```

- `BEGIN` starts the transaction.
- `COMMIT` keeps every change since `BEGIN`, all at once. Until then, nobody else sees them.
- `ROLLBACK` throws every change since `BEGIN` away, as if none had run.

Moving credits from one card to another is the classic case: taking from one card without giving to the other loses money. A family's bookings are the same shape.

## When something fails halfway

The `ROLLBACK` has to run when one of the statements throws, so wrap them:

```js
db.exec('BEGIN')
try {
  // the statements
  db.exec('COMMIT')
} catch (err) {
  db.exec('ROLLBACK')
  throw err
}
```

Two things in there are easy to get wrong.

First, every way out ends the transaction. A transaction left open is worse than none: the next statements on the same connection quietly run inside it, so they look saved but are not, and the next `BEGIN` fails with `cannot start a transaction within a transaction`. `db.isTransaction` tells you whether one is open.

Second, `throw err` after the rollback. The group was not booked because something broke, not because the workshop was full. Passing the error on lets your error handler log it and answer 500, which is the truth. Catching it and answering "full" would send the family away with the wrong reason.

The check makes the database fail on the second booking of a group, then looks at what stayed and whether the next booking still works.

## Your work in this issue

Everything is in `src/store.js`. Make `book` refuse a full workshop first. Then write `bookGroup`: refuse a group that does not fit, and book one that does. Last, put the group's bookings in a transaction that is undone when anything fails.

Run `node try.js` after each task. It uses a fresh copy of the studio's data in memory every run. It fills glazing basics one booking at a time and tries one more, then books two groups on the Thursday wheel class: three people who fit, and four who do not. When you are done, the Thursday class ends with three places left.
