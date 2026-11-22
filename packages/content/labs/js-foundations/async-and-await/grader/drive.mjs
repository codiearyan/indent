// Copied into the sandbox as .grader/drive.mjs. Each export is one case: it hands the learner's
// function the check's own machines, and reports what happened, in order.
import { promiseCase, table } from './waiting.mjs'

const FILE = '../src/checkout.js'

const card = (code) => ({ answer: () => ({ value: { approved: true, code } }) })
const stock = (counts) => table(counts, (name) => `The stock room has no shelf for ${name}`)
const supplier = (arrives) => ({ answer: ([name, count]) => ({ value: { name, count, arrives } }) })

export const paid = (order, code) => promiseCase(FILE, 'paidLine', [order], { chargeCard: card(code) })

export const noted = (name, notes, counts) =>
  promiseCase(FILE, 'stockFor', [name, notes], { countStock: stock(counts) })

export const restock = (name, target, counts, arrives) =>
  promiseCase(FILE, 'reorder', [name, target], {
    countStock: stock(counts),
    orderCandles: supplier(arrives)
  })

export const close = (order, code, left) =>
  promiseCase(FILE, 'closeSale', [order], {
    chargeCard: card(code),
    takeFromStock: { answer: () => ({ value: left }) }
  })
