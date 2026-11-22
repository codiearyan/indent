# A database file and a table

## What you will be able to do

Kilnworth Pottery's API is the one you built in the Express project: six workshop routes, a staff key and one error handler. It keeps every workshop in memory, in a `Map` inside `src/store.js`. Over this repo you move it onto SQLite, a real database in one file. In this first issue you make that file and the table inside it. By the end you will be able to:

- open a SQLite database from Node with `node:sqlite`, which is built in
- create a table with columns, a primary key and fields that cannot be empty
- run SQL with values passed as values, never written into the text
- set a database up the first time and leave it alone after that

## The request from Sunniva

Sunniva Holt runs the front desk. She sends a note on Tuesday morning.

> **Sunniva:** On Monday I took the family morning up to fourteen places and changed two prices. Kofi restarted the server last night, and this morning it says twelve again and the old prices are back. Every restart throws away the week.

The store starts again from `src/workshops.js` every time the process starts. The fix is to keep the workshops somewhere that outlives the process: a file on disk that a database looks after.

## A database in a file

SQLite keeps a whole database in a single file. There is no server to install: Node has it built in as `node:sqlite`.

```js
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data/members.db')
```

That opens the file, and makes it when it is not there yet. The path is read from the folder you run `node` in. SQLite makes the file but not a missing folder, so make the folder first. `mkdirSync` from `node:fs` does that, and with `{ recursive: true }` it also makes the folders above and does nothing when the folder is already there. `dirname` from `node:path` gives the folder part of a path.

The name `DatabaseSync` means every call finishes before the next line of your code runs. There are no promises to wait for.

**On Node 22**, a program that imports `node:sqlite` prints a notice on the terminal: `ExperimentalWarning: SQLite is an experimental feature and might change at any time`, and a second line about `--trace-warnings`. That is only a notice; your code works the same. Newer versions, such as Node 24, print nothing. The checks do not count it.

## Tables, columns and rows

A database holds tables. A table has fixed columns, and each row fills them in. You describe a table once with `CREATE TABLE`:

```sql
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  town TEXT NOT NULL,
  joinedYear INTEGER NOT NULL
)
```

- `INTEGER` holds whole numbers and `TEXT` holds text.
- `PRIMARY KEY` marks the column that tells rows apart. Written exactly `INTEGER PRIMARY KEY`, it also picks the next free number for a row that arrives without one. `INT PRIMARY KEY` looks the same and does not.
- `NOT NULL` means the database refuses a row with nothing in that column. `NULL` is SQL's word for "no value".
- `IF NOT EXISTS` makes it safe to run again: when the table is there, nothing happens. Your server runs this on every start, and without it the second start fails.

`db.exec(sql)` runs SQL that needs no values, such as a `CREATE TABLE`.

## Values travel apart from the query

To add a row you need values: a name, a town, a year. Never build the SQL by joining them into the text:

```js
db.exec(`INSERT INTO members (name, town) VALUES ('${name}', '${town}')`) // never
```

A name such as `Ruairi O'Neill` ends the quotes early and breaks the query, and a cleverer value can change what the query does. Cleaning the text first does not fix the cause: the value is still being read as SQL.

Instead, prepare the SQL once with a `?` where each value goes, and hand the values over when it runs:

```js
const addMember = db.prepare('INSERT INTO members (name, town, joinedYear) VALUES (?, ?, ?)')
addMember.run("Ruairi O'Neill", 'Tollan', 2024)
```

The values reach the database separately, and it never reads them as SQL. A prepared statement can run as many times as you like. This rule holds for every query in this repo, and the checks read the SQL you hand the database to make sure no value is in it.

## Doing it once

A statement can give rows back. `.get()` returns the first row as an object, or `undefined` when there is none, and `.all()` returns every row in an array:

```js
const { count } = db.prepare('SELECT COUNT(*) AS count FROM members').get()
```

`COUNT(*)` counts rows, and `AS count` names the column of the answer, so the row comes back as `{ count: 3 }`.

That is how a first start can be told from every later one. Once the table has any row at all, people have been using it: adding the starting data again would bring back what they removed.

## Your work in this issue

Everything is in `src/db.js`. Write `createTables` first, then `seedWorkshops`, then `openDatabase`, which uses both. The rest of the API still runs from memory for now; the next issues move it onto this file.

Run `node try.js` after each task. It opens `data/kilnworth.db` and prints the workshops in it. Run it twice: the second run should print the same five workshops, not ten. To start over, delete the `data` folder.
