import { checkQuery } from '../../sqlcheck.mjs'

const LAST_DAY =
  "Text compares letter by letter, and a longer text that starts the same way comes after the shorter one, so '2026-11-30 08:14:22' is after '2026-11-30'. BETWEEN ... AND '2026-11-30' keeps the 30th only when it was written with the date alone."
const DATE_ONLY =
  "A cash payment is written with the date alone. '2026-11-30' with no time is exactly the upper limit of the report's BETWEEN, so the report counts it: it is not one it leaves out."

const leftOutVariants = [
  {
    sql: "SELECT id, paid_at, amount_pence FROM payments WHERE paid_at LIKE '2026-11-30%'",
    cause: DATE_ONLY
  },
  {
    sql: "SELECT id, paid_at, amount_pence FROM payments WHERE paid_at > '2026-11-30'",
    cause: 'With no upper limit, this goes on into December. The ticket is about November.'
  },
  {
    sql: "SELECT id, paid_at, amount_pence FROM payments WHERE paid_at >= '2026-11-30' AND paid_at < '2026-12-01'",
    cause: DATE_ONLY
  }
]

const takingsVariants = [
  {
    sql: "SELECT method, COUNT(*) AS payments, SUM(amount_pence) AS takings_pence FROM payments WHERE paid_at BETWEEN '2026-11-01' AND '2026-11-30' GROUP BY method",
    cause: `This is the report as it was. ${LAST_DAY}`
  },
  {
    sql: "SELECT method, COUNT(*) AS payments, SUM(amount_pence) AS takings_pence FROM payments WHERE paid_at BETWEEN '2026-11-01' AND '2026-12-01' GROUP BY method",
    cause: "BETWEEN keeps both limits, so a cash payment written as '2026-12-01' is counted in November."
  },
  {
    sql: "SELECT method, COUNT(*) AS payments, SUM(amount_pence) AS takings_pence FROM payments WHERE paid_at BETWEEN '2026-11-01' AND '2026-11-30 23:59' GROUP BY method",
    cause: "Card payments from the website keep their seconds, so '2026-11-30 23:59:47' comes after '2026-11-30 23:59'. An upper limit that guesses the last moment of the day misses whatever is written in more detail."
  },
  {
    sql: "SELECT method, COUNT(*) AS payments, SUM(amount_pence) AS takings_pence FROM payments WHERE paid_at BETWEEN '2026-11-01 00:00:00' AND '2026-11-30 23:59:59' GROUP BY method",
    cause: "A cash payment written as '2026-11-01' is shorter than '2026-11-01 00:00:00', so it comes before it and drops out. A limit written with a time only fits values written the same way."
  }
]

const TIE =
  'Two seeds have the same number of packets at the cut, and nothing in your ORDER BY decides between them, so SQLite keeps whichever it met first. The task says how a tie is broken.'

const seedsVariants = [
  {
    sql: `SELECT p.name AS product, SUM(l.packets) AS packets FROM products AS p JOIN order_lines AS l ON l.product_id = p.id
JOIN orders AS o ON o.id = l.order_id WHERE o.placed_at >= '2026-01-01' GROUP BY p.id, p.name ORDER BY packets DESC LIMIT 3`,
    cause: TIE,
    when: /\border by [^,]*$/
  },
  {
    sql: `SELECT p.name AS product, SUM(l.packets) AS packets FROM products AS p JOIN order_lines AS l ON l.product_id = p.id
JOIN orders AS o ON o.id = l.order_id WHERE o.placed_at >= '2026-01-01' GROUP BY p.id, p.name ORDER BY packets DESC, p.id LIMIT 3`,
    when: /\border by .*,\s*(\w+\.)?id\b/,
    cause: 'The id decides a tie in your query. The task breaks a tie by the name, from A to Z.'
  },
  {
    sql: `SELECT p.name AS product, SUM(l.packets) AS packets FROM products AS p JOIN order_lines AS l ON l.product_id = p.id
JOIN orders AS o ON o.id = l.order_id WHERE o.placed_at >= '2026-01-01' GROUP BY p.id, p.name ORDER BY packets DESC, p.name DESC LIMIT 3`,
    when: /\border by .*,.*\bdesc\b.*\bdesc\b|\border by .*,\s*(\w+\.)?(name|product)\s+desc\b/,
    cause: 'A tie is broken by the name from A to Z, and DESC sorts from Z to A.'
  },
  {
    sql: `SELECT p.name AS product, SUM(l.packets) AS packets FROM products AS p JOIN order_lines AS l ON l.product_id = p.id
JOIN orders AS o ON o.id = l.order_id GROUP BY p.id, p.name ORDER BY packets DESC, p.name LIMIT 3`,
    cause: 'Without the date, packets from orders before 2026 count too. The box is about this year.'
  }
]

export const checks = {
  'prove-it': (t) =>
    checkQuery(t, 'queries/1-left-out-payments.sql', {
      variants: leftOutVariants,
      fallback:
        "Every November payment that the report's BETWEEN does not keep. Look at how each paid_at is written, and compare it with '2026-11-30' letter by letter."
    }),
  'fix-takings': (t) =>
    checkQuery(t, 'queries/2-takings.sql', {
      variants: takingsVariants,
      causes: (code) => (/\bbetween\b/.test(code) ? [LAST_DAY] : []),
      fallback: 'Look at the first and the last payment that could belong to November, written each way paid_at can be written.'
    }),
  'seeds-of-the-year': (t) =>
    checkQuery(t, 'queries/3-seeds-of-the-year.sql', {
      ordered: true,
      stable: true,
      variants: seedsVariants,
      causes: (code) => (/\blimit\b/.test(code) ? [] : ['The box shows three seeds. Without LIMIT, every seed comes back.']),
      fallback: 'Look at what you sort by, its direction, and what decides between two seeds with the same number of packets.'
    })
}
