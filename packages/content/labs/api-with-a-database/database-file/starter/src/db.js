// Tasks: Create the workshops table, Fill the table once, Open the database file
//
// - createTables(db) makes the workshops table unless the database already has it: id INTEGER
//   PRIMARY KEY, then title, day, seats and priceCents, none of them allowed to be empty (NULL)
// - seedWorkshops(db, workshops) adds the given workshops, with their ids, but only when the
//   table has no rows yet
// - openDatabase(file) makes the folder the file goes in, opens the file, creates the tables,
//   fills them with the studio's workshops the first time, and returns the database
import { DatabaseSync } from 'node:sqlite'
import { workshops } from './workshops.js'

export function createTables(db) {
  throw new Error('Not implemented')
}

export function seedWorkshops(db, workshops) {
  throw new Error('Not implemented')
}

export function openDatabase(file) {
  throw new Error('Not implemented')
}
