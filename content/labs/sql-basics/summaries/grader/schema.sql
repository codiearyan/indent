-- Brindle Bakehouse: the cafes we bake for, what we bake, who drives it, and every order.

CREATE TABLE cafes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  town TEXT NOT NULL,
  contact_email TEXT,          -- NULL when the cafe never gave us one
  joined_on TEXT NOT NULL      -- YYYY-MM-DD
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,      -- 'bread', 'pastry' or 'cake'
  price REAL NOT NULL,         -- wholesale price of one item
  stock INTEGER NOT NULL       -- items on the shelf right now
);

CREATE TABLE drivers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  van TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes (id),
  driver_id INTEGER REFERENCES drivers (id),   -- NULL until a driver is assigned
  ordered_on TEXT NOT NULL,                    -- YYYY-MM-DD
  status TEXT NOT NULL                         -- 'pending', 'delivered' or 'cancelled'
);

CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
