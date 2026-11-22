// The portal's database: SQLite, built into Node, kept in memory so every run starts fresh.
import { DatabaseSync } from 'node:sqlite'
import { scryptSync } from 'node:crypto'
import { customers, orders } from './seed.js'

export function hashPassword(password, salt) {
  return scryptSync(password, salt, 32).toString('hex')
}

export function openDb() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, salt TEXT, password_hash TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY, customer_id INTEGER, title TEXT, status TEXT, note TEXT,
      ship_to TEXT, total REAL
    );
    CREATE TABLE sessions (token TEXT PRIMARY KEY, customer_id INTEGER);
  `)
  const addCustomer = db.prepare(
    'INSERT INTO customers (id, name, email, salt, password_hash) VALUES (?, ?, ?, ?, ?)'
  )
  for (const c of customers) {
    addCustomer.run(c.id, c.name, c.email, c.salt, hashPassword(c.password, c.salt))
  }
  const addOrder = db.prepare(
    'INSERT INTO orders (id, customer_id, title, status, note, ship_to, total) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  for (const o of orders) {
    addOrder.run(o.id, o.customerId, o.title, o.status, o.note, o.shipTo, o.total)
  }
  return db
}
