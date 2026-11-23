// The shop's own knowledge of its orders. Given: you do not need to change this file.
//
// An order file has one order on each line: id,item,quantity,paper,due
// Blank lines and lines that start with # are notes, not orders.
//
// Each command below takes the lines readOrders() gives ({ file, line, text }), the flags, and
// `out`, the two ways a command can speak:
//   out.result(text, value)  one result: the text for a person, the value for a program
//   out.note(text)           a message for the person at the terminal
// It returns true when all is well, and false when it found a problem.

export const ITEMS = ['card', 'invite', 'poster', 'envelope']
export const PAPERS = ['cotton', 'linen', 'kraft']
export const FIELDS = ['id', 'item', 'quantity', 'paper', 'due']

const isOrder = (text) => text.trim() !== '' && !text.trim().startsWith('#')
const fieldsOf = (text) => text.split(',').map((field) => field.trim())
const WHOLE = /^[1-9]\d*$/

/** The first thing wrong with an order line, or undefined when it looks right. */
export function problemWith(text) {
  const fields = fieldsOf(text)
  if (fields.length !== FIELDS.length) return `has ${fields.length} fields, not ${FIELDS.length}`
  const [, item, quantity, paper, due] = fields
  if (!ITEMS.includes(item)) return `item "${item}" is not one the shop prints`
  if (!WHOLE.test(quantity)) return `quantity "${quantity}" is not a whole number above 0`
  if (!PAPERS.includes(paper)) return `paper "${paper}" is not one the shop stocks`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return `due "${due}" is not a date like 2026-11-30`
  return undefined
}

/** An order line as an object; a quantity that is a whole number becomes a number. */
export function toOrder(text) {
  const order = Object.fromEntries(FIELDS.map((name, i) => [name, fieldsOf(text)[i] ?? '']))
  if (WHOLE.test(order.quantity)) order.quantity = Number(order.quantity)
  return order
}

export async function countOrders(lines, flags, out) {
  if (flags.by !== undefined && !FIELDS.includes(flags.by)) {
    throw new Error(`--by takes one of ${FIELDS.join(', ')}, not "${flags.by}"`)
  }
  let total = 0
  const counts = new Map()
  for await (const { text } of lines) {
    if (!isOrder(text)) continue
    if (flags.paper !== undefined && toOrder(text).paper !== flags.paper) continue
    total++
    if (flags.by !== undefined) {
      const value = String(toOrder(text)[flags.by])
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  if (flags.by === undefined) {
    out.result(`${total} orders`, { orders: total })
    return true
  }
  for (const value of [...counts.keys()].sort()) {
    out.result(`${value} ${counts.get(value)}`, { [flags.by]: value, orders: counts.get(value) })
  }
  return true
}

export async function listOrders(lines, flags, out) {
  if (flags.limit !== undefined && !WHOLE.test(flags.limit)) {
    throw new Error(`--limit must be a whole number above 0, not "${flags.limit}"`)
  }
  const limit = flags.limit === undefined ? Infinity : Number(flags.limit)
  let shown = 0
  for await (const { text } of lines) {
    if (!isOrder(text)) continue
    const order = toOrder(text)
    if (flags.paper !== undefined && order.paper !== flags.paper) continue
    out.result(`${order.id} ${order.item} x${order.quantity} on ${order.paper}, due ${order.due}`, order)
    shown++
    if (shown >= limit) break
  }
  return true
}

export async function checkOrders(lines, flags, out) {
  let total = 0
  let problems = 0
  for await (const { file, line, text } of lines) {
    if (!isOrder(text)) continue
    total++
    const problem = problemWith(text)
    if (problem === undefined) continue
    problems++
    out.result(`${file}:${line}: ${problem}`, { file, line, problem })
  }
  if (problems === 0) out.note(`All ${total} orders look right.`)
  else out.note(`${problems} ${problems === 1 ? 'problem' : 'problems'} in ${total} orders.`)
  return problems === 0
}
