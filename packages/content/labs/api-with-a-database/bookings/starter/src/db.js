// Task: Keep bookings in a table of their own
//
// - createTables(db) makes the workshops table and the bookings table, each unless the database
//   already has it. A booking has an id (INTEGER PRIMARY KEY), a workshopId that must name a row of
//   workshops, and a name; neither of those two may be empty (NULL)
// - seedWorkshops(db, workshops) adds the given workshops only when the table has no rows yet
// - openDatabase(file) makes the folder, opens the file, creates the tables, fills them the first
//   time and returns the database
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
