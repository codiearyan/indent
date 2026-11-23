import { checkQuery } from '../../sqlcheck.mjs'

const TOTALS = '(SELECT order_id, SUM(packets * price_pence) AS total FROM order_lines GROUP BY order_id) AS t ON t.order_id = o.id'
const WHOLE =
  'Both numbers in that division are whole numbers, so SQLite drops everything after the point before you ever see it.'
const OF_AVERAGES =
  "This is an average of each customer's average. A customer with five orders counts the same as a customer with one, so the result is not what one order comes to."
const ROUNDED = 'The task asks for pounds rounded to two places, with ROUND and 2.'
const LINES = 'After joining the lines, each row is one line of an order, so COUNT(*) counts lines and AVG averages lines. An order is one row only before its lines are joined.'

const handVariants = [
  {
    sql: 'SELECT o.channel, COUNT(*) AS orders, SUM(l.packets * l.price_pence) AS takings_pence FROM orders AS o JOIN order_lines AS l ON l.order_id = o.id GROUP BY o.channel',
    cause: 'takings_pence is right, but orders counts the lines: after the join, an order with three lines is three rows.'
  },
  {
    sql: 'SELECT o.channel, COUNT(*) AS orders, SUM(p.amount_pence) AS takings_pence FROM orders AS o JOIN payments AS p ON p.order_id = o.id GROUP BY o.channel',
    cause: 'orders counts the payments: after joining payments, an order paid in two parts is two rows.'
  }
]

const averageVariants = [
  {
    sql: `SELECT channel, ROUND(AVG(customer_average), 2) AS average_pounds FROM (SELECT o.channel, o.customer_id,
SUM(l.packets * l.price_pence) / COUNT(DISTINCT o.id) / 100 AS customer_average FROM orders AS o JOIN order_lines AS l ON l.order_id = o.id
GROUP BY o.channel, o.customer_id) GROUP BY channel`,
    cause: `This is the report as it was, with two faults. ${OF_AVERAGES} And inside it, ${WHOLE.charAt(0).toLowerCase()}${WHOLE.slice(1)}`
  },
  {
    sql: `SELECT channel, ROUND(AVG(customer_average), 2) AS average_pounds FROM (SELECT o.channel, o.customer_id,
SUM(l.packets * l.price_pence) / COUNT(DISTINCT o.id) / 100.0 AS customer_average FROM orders AS o JOIN order_lines AS l ON l.order_id = o.id
GROUP BY o.channel, o.customer_id) GROUP BY channel`,
    cause: OF_AVERAGES
  },
  {
    sql: `SELECT o.channel, ROUND(SUM(t.total) / COUNT(*) / 100.0, 2) AS average_pounds FROM orders AS o JOIN ${TOTALS} GROUP BY o.channel`,
    cause: `It averages the orders now, but ${WHOLE.charAt(0).toLowerCase()}${WHOLE.slice(1)}`
  },
  {
    sql: `SELECT o.channel, ROUND(SUM(t.total) / COUNT(*) / 100, 2) AS average_pounds FROM orders AS o JOIN ${TOTALS} GROUP BY o.channel`,
    cause: `It averages the orders now, but ${WHOLE.charAt(0).toLowerCase()}${WHOLE.slice(1)}`
  },
  {
    sql: 'SELECT o.channel, ROUND(AVG(l.packets * l.price_pence) / 100.0, 2) AS average_pounds FROM orders AS o JOIN order_lines AS l ON l.order_id = o.id GROUP BY o.channel',
    cause: LINES
  },
  {
    sql: `SELECT o.channel, ROUND(SUM(l.packets * l.price_pence) / COUNT(DISTINCT o.id) / 100, 2) AS average_pounds FROM orders AS o
JOIN order_lines AS l ON l.order_id = o.id GROUP BY o.channel`,
    cause: `It divides the takings by the orders now, but ${WHOLE.charAt(0).toLowerCase()}${WHOLE.slice(1)}`
  },
  {
    sql: `SELECT o.channel, AVG(t.total) / 100.0 AS average_pounds FROM orders AS o JOIN ${TOTALS} GROUP BY o.channel`,
    cause: `The average is right. ${ROUNDED}`
  }
]

const BY_LINE =
  'The test in WHERE looks at one line at a time, before any rows are grouped, so it keeps big lines, not big customers, and the total adds up only those lines. A test on a total belongs in HAVING, which runs on each group after it is added up.'
const tradeVariants = [
  {
    sql: `SELECT c.name AS customer, SUM(l.packets * l.price_pence) AS spent_pence FROM customers AS c JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id WHERE o.placed_at >= '2026-01-01' AND l.packets * l.price_pence > 4000 GROUP BY c.id, c.name`,
    cause: `This is the list as it was. ${BY_LINE}`
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets * l.price_pence) AS spent_pence FROM customers AS c JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id WHERE o.placed_at >= '2026-01-01' AND l.packets * l.price_pence > 4000 GROUP BY c.id, c.name
HAVING SUM(l.packets * l.price_pence) > 4000`,
    cause: `The test on the total is in HAVING now, but the test on single lines is still in WHERE, so only big lines are added up. ${BY_LINE.split('. ')[0]}.`
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets * l.price_pence) AS spent_pence FROM customers AS c JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id GROUP BY c.id, c.name HAVING SUM(l.packets * l.price_pence) > 4000`,
    cause: 'Without the date, orders from before 2026 count towards the total too. Choosing which orders to add up is a test on single rows, and it stays in WHERE.'
  },
  {
    sql: `SELECT c.name AS customer, SUM(l.packets * l.price_pence) AS spent_pence FROM customers AS c JOIN orders AS o ON o.customer_id = c.id
JOIN order_lines AS l ON l.order_id = o.id WHERE o.placed_at >= '2026-01-01' GROUP BY c.id, c.name HAVING SUM(l.packets * l.price_pence) >= 4000`,
    cause: 'The trade price is for more than £40, so a customer whose orders come to exactly 4000 pence does not get it.'
  }
]

export const checks = {
  'prove-it': (t) =>
    checkQuery(t, 'queries/1-hand-count.sql', {
      variants: handVariants,
      fallback: 'Count each order once, and add up every line of every order on the channel.'
    }),
  'fix-average': (t) =>
    checkQuery(t, 'queries/2-averages.sql', {
      variants: averageVariants,
      causes: (code) => {
        const found = []
        if (!/\bround\s*\(.*,\s*2\s*\)/.test(code)) found.push(ROUNDED)
        if (/\/\s*100\b(?!\.)/.test(code) && !/\*\s*1\.0|\.0\b|\breal\b|\bavg\s*\(/.test(code)) found.push(WHOLE)
        return found
      },
      fallback: 'Work out what one order comes to first, then average those orders on each channel, in pounds.'
    }),
  'trade-price': (t) =>
    checkQuery(t, 'queries/3-trade-price.sql', {
      variants: tradeVariants,
      causes: (code) => {
        const having = code.split(/\bhaving\b/)[1] ?? ''
        const found = []
        if (/placed_at/.test(having)) {
          found.push('A test on one row, such as the date of an order, belongs in WHERE. In HAVING, a plain column of a group gives the value of just one of its rows.')
        }
        if (/\/\s*100\b(?!\.)/.test(having)) {
          found.push('Dividing whole numbers drops the fraction, so a customer at £40 and some pence comes out as 40, which is not more than 40.')
        }
        return found
      },
      fallback: 'Look at what each condition tests: one row at a time belongs in WHERE, a total of a group belongs in HAVING.'
    })
}
