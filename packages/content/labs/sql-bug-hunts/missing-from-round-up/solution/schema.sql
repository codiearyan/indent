-- Mallowfield Seeds: the customers, the seeds on sale, every order and its lines, the payments
-- that came in, and the boxes of packets that arrived from the growers.
-- Lines that start with two dashes are notes for people. SQLite skips them.
-- Money is in pence, as whole numbers: 280 is £2.80.

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,                 -- NULL when the customer never gave one
  town TEXT NOT NULL,
  post TEXT                   -- may we post them a catalogue: 'yes', 'no', or NULL when nobody asked
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,         -- 'vegetable', 'flower' or 'herb'
  price_pence INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,        -- the id in customers, NULL for a sale at the market stall
  placed_at TEXT NOT NULL,    -- website 'YYYY-MM-DD HH:MM:SS', phone 'YYYY-MM-DD HH:MM', market 'YYYY-MM-DD'
  channel TEXT NOT NULL       -- 'website', 'phone' or 'market'
);

CREATE TABLE order_lines (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,  -- the id in orders
  product_id INTEGER NOT NULL,-- the id in products
  packets INTEGER NOT NULL,
  price_pence INTEGER NOT NULL -- the price of one packet on the day of the order
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,  -- the id in orders; an order can be paid in two parts
  paid_at TEXT NOT NULL,      -- card 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD HH:MM', cash 'YYYY-MM-DD'
  method TEXT NOT NULL,       -- 'card', 'cash' or 'voucher'
  amount_pence INTEGER NOT NULL
);

CREATE TABLE restocks (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,-- the id in products
  received_on TEXT NOT NULL,  -- YYYY-MM-DD
  packets INTEGER NOT NULL
);
