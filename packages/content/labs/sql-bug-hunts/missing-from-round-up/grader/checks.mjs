import { checkQuery } from '../../sqlcheck.mjs'

const NOT_IN_NULL =
  'The list after NOT IN holds a NULL from a market sale, so NOT IN is never true. The issue about the win-back list has the same trap.'
const WHERE_AFTER =
  "WHERE runs after the LEFT JOIN. A customer it kept with no partner has NULL in every column of orders, the date test is not true, and the customer drops out again: the LEFT JOIN has quietly become a plain one."
const OR_NULL =
  'OR placed_at IS NULL brings back the customers with no orders at all, but a customer whose orders are all from before 2026 still has rows, each with an old date, and WHERE throws every one of them away.'

const leftOutVariants = [
  {
    sql: 'SELECT c.id, c.name AS customer FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id WHERE o.id IS NULL',
    cause: 'These are the customers with no order at all. A customer whose orders are all from before 2026 is left out of the round-up too.'
  },
  {
    sql: "SELECT DISTINCT c.id, c.name AS customer FROM customers AS c JOIN orders AS o ON o.customer_id = c.id WHERE o.placed_at < '2026-01-01'",
    cause: 'A customer with an order from 2025 can have one from 2026 as well, and then the round-up shows them. Look for customers with no order from 2026 at all.'
  },
  {
    sql: "SELECT c.id, c.name AS customer FROM customers AS c WHERE c.id NOT IN (SELECT customer_id FROM orders WHERE placed_at >= '2026-01-01')",
    cause: NOT_IN_NULL
  }
]

const roundUpVariants = [
  {
    sql: `SELECT c.name AS customer, COALESCE(SUM(l.packets * l.price_pence), 0) AS spent_pence FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id LEFT JOIN order_lines AS l ON l.order_id = o.id
WHERE o.placed_at >= '2026-01-01' GROUP BY c.id, c.name`,
    cause: `This is the round-up as it was. ${WHERE_AFTER}`
  },
  {
    sql: `SELECT c.name AS customer, COALESCE(SUM(l.packets * l.price_pence), 0) AS spent_pence FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id LEFT JOIN order_lines AS l ON l.order_id = o.id
WHERE o.placed_at >= '2026-01-01' OR o.placed_at IS NULL GROUP BY c.id, c.name`,
    cause: OR_NULL
  },
  {
    sql: `SELECT c.name AS customer, COALESCE(SUM(l.packets * l.price_pence), 0) AS spent_pence FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id LEFT JOIN order_lines AS l ON l.order_id = o.id GROUP BY c.id, c.name`,
    cause: 'Every customer is back, but the total now counts orders from before 2026 too. The round-up is about 2026.'
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets * l.price_pence) AS spent_pence FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.placed_at >= '2026-01-01' LEFT JOIN order_lines AS l ON l.order_id = o.id GROUP BY c.id, c.name`,
    cause: 'A customer with nothing in 2026 has nothing to add up, so SUM gives NULL. The round-up shows 0 there.'
  }
]

const novemberVariants = [
  {
    sql: `SELECT p.name AS product, COALESCE(SUM(l.packets), 0) AS packets FROM products AS p
LEFT JOIN order_lines AS l ON l.product_id = p.id LEFT JOIN orders AS o ON o.id = l.order_id
WHERE o.placed_at LIKE '2026-11%' GROUP BY p.id, p.name`,
    cause: `This is the re-order list as it was. ${WHERE_AFTER.replace('A customer', 'A seed').replace('the customer drops', 'the seed drops')}`
  },
  {
    sql: `SELECT p.name AS product, COALESCE(SUM(l.packets), 0) AS packets FROM products AS p
LEFT JOIN order_lines AS l ON l.product_id = p.id LEFT JOIN orders AS o ON o.id = l.order_id AND o.placed_at LIKE '2026-11%'
GROUP BY p.id, p.name`,
    cause:
      "Moving the test into the ON of orders only stops other months' orders from pairing with their lines. The lines themselves still pair with the seed, and SUM adds their packets. The test has to decide which lines pair with the seed."
  },
  {
    sql: `SELECT p.name AS product, COALESCE(SUM(l.packets), 0) AS packets FROM products AS p
LEFT JOIN order_lines AS l ON l.product_id = p.id LEFT JOIN orders AS o ON o.id = l.order_id
WHERE o.placed_at LIKE '2026-11%' OR o.placed_at IS NULL GROUP BY p.id, p.name`,
    cause:
      'OR placed_at IS NULL brings back the seeds that were never sold, but a seed sold only in other months still has rows, each with another date, and WHERE throws them all away.'
  },
  {
    sql: `SELECT p.name AS product, n.packets FROM products AS p LEFT JOIN (SELECT l.product_id, SUM(l.packets) AS packets
FROM order_lines AS l JOIN orders AS o ON o.id = l.order_id WHERE o.placed_at LIKE '2026-11%' GROUP BY l.product_id) AS n ON n.product_id = p.id`,
    cause: 'A seed with no November sale has nothing to add up, so its packets is NULL. The list shows 0 there.'
  }
]

const notIn = (code) => (/\bnot\s+in\s*\(\s*select\s+(\w+\.)?customer_id\b/.test(code) && !/customer_id\s+is\s+not\s+null|coalesce|ifnull/.test(code) ? [NOT_IN_NULL] : [])

export const checks = {
  'prove-it': (t) =>
    checkQuery(t, 'queries/1-left-out.sql', {
      variants: leftOutVariants,
      causes: notIn,
      fallback: 'Look for every customer with no order placed on or after 2026-01-01: none at all, or only older ones.'
    }),
  'fix-round-up': (t) =>
    checkQuery(t, 'queries/2-round-up.sql', {
      variants: roundUpVariants,
      causes: (code) => (/\bwhere\b[^()]*placed_at/.test(code) ? [WHERE_AFTER] : []),
      fallback: 'Look at where the test on the date sits: it should decide which orders count as partners, not which customers stay.'
    }),
  'november-packets': (t) =>
    checkQuery(t, 'queries/3-november-packets.sql', {
      variants: novemberVariants,
      fallback:
        'Every seed stays, and only the lines of November orders count towards it. Look at which rows your test removes, and which rows still reach SUM.'
    })
}
