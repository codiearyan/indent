import { checkQuery } from '../../sqlcheck.mjs'

const EQUALS_NULL =
  'A comparison like = NULL is never true, not even for an empty cell, so it matches nothing. An empty cell has its own test, IS NULL.'
const NOT_EQUAL =
  "<> 'no' is unknown for a customer nobody asked, because NULL compared with anything is unknown, and WHERE keeps only rows where it is true. So the customers nobody asked drop out without a word."
const COUNT_COLUMN =
  'COUNT(post) skips the customers whose post is NULL, so the ones nobody asked are not counted even when they get a catalogue. COUNT(*) counts rows.'

const emptyingVariants = [
  {
    sql: "SELECT id, placed_at, channel FROM orders WHERE customer_id IS NULL",
    cause: 'Only the orders the query in brackets reads can empty the list: those placed on or after 1 September 2026. Older market sales never reach the list after NOT IN.'
  },
  {
    sql: "SELECT id, placed_at, channel FROM orders WHERE placed_at > '2026-09-01' AND customer_id IS NULL",
    cause: "A sale typed with the date alone on 1 September is exactly '2026-09-01', so > leaves it out. The query in brackets uses >=, which keeps it."
  },
  {
    sql: "SELECT id, placed_at, channel FROM orders WHERE placed_at >= '2026-09-01'",
    cause: 'Every order since 1 September is here. An order with a customer puts a real id in the list, and a real id only takes out that one customer. The list is emptied by the orders whose customer_id is NULL.'
  }
]

emptyingVariants.push({
  sql: "SELECT id, placed_at, channel FROM orders WHERE placed_at >= '2026-09-01' AND channel = 'market'",
  cause: 'A sale at the market can have a customer: a regular who gives their name at the stall. What empties the list is an order whose customer_id is NULL, whatever its channel.'
})

const winBackVariants = [
  {
    sql: "SELECT c.name AS customer, c.email FROM customers AS c WHERE c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.placed_at >= '2026-09-01')",
    cause: 'The list is still empty. The list after NOT IN holds a NULL from a market sale. For every customer, "not equal to NULL" is unknown, so NOT IN is never true and no customer passes.'
  },
  {
    sql: 'SELECT c.name AS customer, c.email FROM customers AS c WHERE c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.customer_id IS NOT NULL)',
    cause: 'Without the date, the list after NOT IN holds every customer who ever ordered, so only those who never ordered are left. The win-back list is about orders since 1 September 2026.'
  },
  {
    sql: "SELECT DISTINCT c.name AS customer, c.email FROM customers AS c JOIN orders AS o ON o.customer_id = c.id WHERE o.placed_at < '2026-09-01'",
    cause: 'This keeps every customer who has some order from before September, even one who ordered again after it, and it loses the customers who never ordered at all.'
  },
  {
    sql: "SELECT c.name AS customer, c.email FROM customers AS c WHERE c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.placed_at >= '2026-09-01' AND o.customer_id IS NOT NULL) AND c.email IS NOT NULL",
    cause: 'A customer with no email is still on the win-back list; their email column is NULL.'
  },
  {
    sql: "SELECT c.name AS customer, c.email FROM customers AS c WHERE c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.placed_at >= '2026-09-01' AND o.channel <> 'market')",
    cause: 'A regular who gives their name at the stall has a market order with a real customer id: they have ordered since September. What empties the list is a NULL customer_id, whatever the channel.',
    when: /\bchannel\b/
  },
  {
    sql: "SELECT c.name AS customer, c.email FROM customers AS c WHERE c.id IN (SELECT customer_id FROM orders) AND c.id NOT IN (SELECT o.customer_id FROM orders AS o WHERE o.placed_at >= '2026-09-01' AND o.customer_id IS NOT NULL)",
    cause: 'A customer who never ordered at all has not ordered since September either, so they belong on the list too.'
  }
]

const catalogueVariants = [
  // On the data you can see these three return the same rows, so the query decides which cause is named.
  {
    sql: "SELECT town, COUNT(post) AS catalogues FROM customers WHERE post <> 'no' GROUP BY town",
    cause: `${NOT_EQUAL} ${COUNT_COLUMN}`,
    when: /^(?=.*\bcount\s*\(\s*(\w+\.)?post\s*\))(?=.*post\s*(<>|!=)\s*'')(?!.*(is\s+null|coalesce|ifnull))/
  },
  {
    sql: "SELECT town, COUNT(post) AS catalogues FROM customers WHERE post IS NULL OR post <> 'no' GROUP BY town",
    cause: COUNT_COLUMN,
    when: /\bcount\s*\(\s*(\w+\.)?post\s*\)/
  },
  { sql: "SELECT town, COUNT(*) AS catalogues FROM customers WHERE post <> 'no' GROUP BY town", cause: NOT_EQUAL, when: /post\s*(<>|!=)\s*''/ },
  {
    sql: 'SELECT town, COUNT(*) AS catalogues FROM customers GROUP BY town',
    cause: "Every customer is counted now, those who said no included. Perpetua's rule leaves out only the customers with 'no'."
  },
  {
    sql: "SELECT town, COUNT(*) AS catalogues FROM customers WHERE post IS NULL OR post <> 'no' GROUP BY town HAVING COUNT(post) > 0",
    cause: 'A town where nobody was asked still gets catalogues: every customer there gets one.'
  }
]

export const checks = {
  'prove-it': (t) =>
    checkQuery(t, 'queries/1-emptying-orders.sql', {
      variants: emptyingVariants,
      causes: (code) => (/(=|<>|!=)\s*null\b/.test(code) ? [EQUALS_NULL] : []),
      fallback: 'Read the query in brackets in 2-win-back.sql: which orders does it read, and which of them give it a NULL?'
    }),
  'fix-win-back': (t) =>
    checkQuery(t, 'queries/2-win-back.sql', {
      variants: winBackVariants,
      causes: (code) => (/(=|<>|!=)\s*null\b/.test(code) ? [EQUALS_NULL] : []),
      fallback:
        'Look at what the list after NOT IN holds, and decide what an order with no customer should mean for this list: it belongs to nobody on it.'
    }),
  catalogues: (t) =>
    checkQuery(t, 'queries/3-catalogues.sql', {
      variants: catalogueVariants,
      causes: (code, mine) => {
        const found = []
        if (/(=|<>|!=)\s*null\b/.test(code)) found.push(EQUALS_NULL)
        if (mine.rows.some((r) => r[1] === 0)) found.push('A town where every customer said no gets no catalogue, so it has no row.')
        if (/\bcount\s*\(\s*(\w+\.)?post\s*\)/.test(code)) found.push(COUNT_COLUMN)
        if (/post\s*(<>|!=)\s*''/.test(code) && !/post\s+is\s+null|coalesce|ifnull|is\s+not\s+''/.test(code)) found.push(NOT_EQUAL)
        return found
      },
      fallback: "Look at each place a NULL in post can go missing: the condition in WHERE, and what is counted."
    })
}
