// Tasks: Create the workshops table, Fill the table once, Open the database file
//
// - createTables(db) makes the workshops table unless the database already has it: id INTEGER
//   PRIMARY KEY, then title, day, seats and priceCents, none of them allowed to be empty (NULL)
// - seedWorkshops(db, workshops) adds the given workshops, with their ids, but only when the
//   table has no rows yet
// - openDatabase(file) makes the folder the file goes in, opens the file, creates the tables,
//   fills them with the studio's workshops the first time, and returns the database
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { workshops } from './workshops.js'

export function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workshops (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      day TEXT NOT NULL,
      seats INTEGER NOT NULL,
      priceCents INTEGER NOT NULL
    )
  `)
}

export function seedWorkshops(db, workshops) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM workshops').get()
  if (count > 0) return
  const insert = db.prepare(
    'INSERT INTO workshops (id, title, day, seats, priceCents) VALUES (?, ?, ?, ?, ?)'
  )
  for (const w of workshops) insert.run(w.id, w.title, w.day, w.seats, w.priceCents)
}

export function openDatabase(file) {
  mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  createTables(db)
  seedWorkshops(db, workshops)
  return db
}
