import { checkQuery } from '../../sqlcheck.mjs'

const JOIN = `FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id
JOIN payments AS p ON p.order_id = o.id`
const BOUGHT = `(SELECT o.customer_id, SUM(l.packets) AS packets FROM orders AS o
  JOIN order_lines AS l ON l.order_id = o.id GROUP BY o.customer_id) AS b ON b.customer_id = c.id`
const PAID = `(SELECT o.customer_id, SUM(p.amount_pence) AS paid FROM orders AS o
  JOIN payments AS p ON p.order_id = o.id GROUP BY o.customer_id) AS q ON q.customer_id = c.id`

const SAME_VALUE =
  'SUM(DISTINCT ...) adds each different value once, so two real rows with the same value, such as two payments of the same amount, count as one. A repeat made by the join looks exactly like a real one, so DISTINCT cannot tell them apart.'
const DIVIDED =
  'Dividing by how many payments or lines there are only mends a customer whose orders all repeat the same number of times. When one order is paid in two parts and another in one, no single number divides both back.'
const DISTINCT_ROWS = 'DISTINCT removes whole result rows that repeat, not the repeats inside a sum.'

const proveVariants = [
  {
    sql: `SELECT o.id AS order_id, c.name AS customer, COUNT(*) AS copies ${JOIN} GROUP BY o.id, c.name`,
    cause: 'This lists every order, those the join turns into one row included. Keep only the orders that fill more than one row.'
  },
  {
    sql: `SELECT o.id AS order_id, c.name AS customer, COUNT(*) AS copies ${JOIN} GROUP BY o.id, c.name HAVING COUNT(DISTINCT p.id) > 1`,
    cause: 'Only orders paid in more than one part are here. An order with several lines and one payment fills several rows too: its one payment meets every line.'
  },
  {
    sql: `SELECT o.id AS order_id, c.name AS customer, COUNT(*) AS copies ${JOIN} GROUP BY o.id, c.name HAVING COUNT(DISTINCT l.id) > 1`,
    cause: 'Only orders with more than one line are here. An order paid in two parts fills two rows for each line: each payment meets every line.'
  },
  {
    sql: `SELECT o.id AS order_id, c.name AS customer, COUNT(*) AS copies FROM orders AS o LEFT JOIN customers AS c ON c.id = o.customer_id
JOIN order_lines AS l ON l.order_id = o.id JOIN payments AS p ON p.order_id = o.id GROUP BY o.id, c.name HAVING COUNT(*) > 1`,
    cause: 'A sale at the market has no customer, so it is on nobody\'s statement: the statement\'s plain JOIN to customers leaves it out. Use the statement\'s join as it is.'
  }
]

const statementVariants = [
  {
    sql: `SELECT c.name AS customer, SUM(l.packets) AS packets, SUM(p.amount_pence) AS paid_pence ${JOIN} GROUP BY c.id, c.name`,
    cause: 'These are the statements as they were. Each line of an order meets each of its payments, so packets is multiplied by the number of payments and paid_pence by the number of lines.'
  },
  {
    sql: `SELECT c.name AS customer, SUM(DISTINCT l.packets) AS packets, SUM(DISTINCT p.amount_pence) AS paid_pence ${JOIN} GROUP BY c.id, c.name`,
    cause: SAME_VALUE
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets) / COUNT(DISTINCT p.id) AS packets, SUM(p.amount_pence) / COUNT(DISTINCT l.id) AS paid_pence ${JOIN} GROUP BY c.id, c.name`,
    cause: DIVIDED
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets) AS packets, q.paid AS paid_pence ${JOIN} JOIN ${PAID} GROUP BY c.id, c.name`,
    cause: 'paid_pence is right now, but packets still comes from a join with payments: an order paid in two parts counts its packets twice.'
  },
  {
    sql: `SELECT c.name AS customer, b.packets, SUM(p.amount_pence) AS paid_pence ${JOIN} JOIN ${BOUGHT} GROUP BY c.id, c.name`,
    cause: 'packets is right now, but paid_pence still comes from a join with the order lines: a payment counts once for every line of its order.'
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets) AS packets, SUM(p.amount_pence) AS paid_pence FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id JOIN order_lines AS l ON l.order_id = o.id JOIN payments AS p ON p.order_id = o.id
WHERE p.method <> 'voucher' GROUP BY c.id, c.name`,
    cause: 'A payment by voucher is still money paid, and leaving it out does not stop the lines repeating each payment. Look at what the join does to an order with several lines.'
  }
]

const stockVariants = [
  {
    sql: `SELECT p.name AS product, COALESCE(SUM(r.packets), 0) AS received, COALESCE(SUM(l.packets), 0) AS sold,
COALESCE(SUM(r.packets), 0) - COALESCE(SUM(l.packets), 0) AS in_stock FROM products AS p
LEFT JOIN restocks AS r ON r.product_id = p.id LEFT JOIN order_lines AS l ON l.product_id = p.id GROUP BY p.id, p.name`,
    cause: 'This is the stock check as it was. Restocks and order lines both hang off the seed, so each restock meets each line: received is multiplied by the number of lines, and sold by the number of restocks.'
  },
  {
    sql: `SELECT p.name AS product, COALESCE(SUM(DISTINCT r.packets), 0) AS received, COALESCE(SUM(DISTINCT l.packets), 0) AS sold,
COALESCE(SUM(DISTINCT r.packets), 0) - COALESCE(SUM(DISTINCT l.packets), 0) AS in_stock FROM products AS p
LEFT JOIN restocks AS r ON r.product_id = p.id LEFT JOIN order_lines AS l ON l.product_id = p.id GROUP BY p.id, p.name`,
    cause: SAME_VALUE
  },
  {
    sql: `SELECT p.name AS product, r.received, s.sold, r.received - s.sold AS in_stock FROM products AS p
LEFT JOIN (SELECT product_id, SUM(packets) AS received FROM restocks GROUP BY product_id) AS r ON r.product_id = p.id
LEFT JOIN (SELECT product_id, SUM(packets) AS sold FROM order_lines GROUP BY product_id) AS s ON s.product_id = p.id`,
    cause: 'A seed with no restock or no sale has no row to add up, so its total is NULL, and anything worked out from NULL is NULL too. The task wants 0 there.'
  },
  {
    sql: `SELECT p.name AS product, r.received, s.sold, r.received - s.sold AS in_stock FROM products AS p
JOIN (SELECT product_id, SUM(packets) AS received FROM restocks GROUP BY product_id) AS r ON r.product_id = p.id
JOIN (SELECT product_id, SUM(packets) AS sold FROM order_lines GROUP BY product_id) AS s ON s.product_id = p.id`,
    cause: 'A plain JOIN to a total drops every seed that has none of those rows. The stock check lists every seed.'
  }
]

const fanOut = (code) => {
  const found = []
  if (/\bsum\s*\(\s*distinct\b/.test(code)) found.push(SAME_VALUE)
  else if (/\bselect\s+distinct\b/.test(code)) found.push(DISTINCT_ROWS)
  if (/\bsum\s*\([^()]*\)\s*\/\s*count\b/.test(code)) found.push(DIVIDED)
  return found
}

export const checks = {
  'prove-it': (t) =>
    checkQuery(t, 'queries/1-counted-twice.sql', {
      variants: proveVariants,
      fallback:
        'Start from the FROM part of 2-statements.sql, unchanged, group its rows by order, and count how many rows each order fills.'
    }),
  'fix-statements': (t) =>
    checkQuery(t, 'queries/2-statements.sql', {
      variants: statementVariants,
      causes: (code, mine) => [
        ...(mine.rows.some((r) => !r[1])
          ? ['The statements list only the customers who have placed an order. A customer with no order has no statement, so no row.']
          : []),
        ...fanOut(code)
      ],
      fallback:
        'Look at where each total is added up. A sum over a join that repeats rows adds the repeats too, so each total has to be worked out where every packet, or every payment, is one row.'
    }),
  'stock-check': (t) =>
    checkQuery(t, 'queries/3-stock-check.sql', {
      variants: stockVariants,
      causes: fanOut,
      fallback:
        'Look at where received and sold are added up. Each one has to be worked out where every restock, or every order line, is one row, and a seed with none still gets 0.'
    })
}
