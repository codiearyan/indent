// Copied into the sandbox as .grader/drive.mjs. Each export is one case: it hands the learner's
// function the check's own machines and clock, and reports what happened, in order.
import { promiseCase, table } from './waiting.mjs'

const FILE = '../src/promises.js'

const tracker = (parcels) =>
  table(
    Object.fromEntries(Object.entries(parcels).map(([id, status]) => [id, { id, status }])),
    (id) => `The tracker has no parcel called ${id}`
  )

export const status = (id, parcels) => promiseCase(FILE, 'statusLine', [id], { trackParcel: tracker(parcels) })

export const set = (candle, ms) => promiseCase(FILE, 'setIn', [candle, ms])

export const count = (name, shelves) =>
  promiseCase(FILE, 'stockCount', [name], {
    askStockRoom: table(shelves, () => '', { callback: true })
  })

export const order = (orderId, orders, parcels) =>
  promiseCase(FILE, 'orderStatus', [orderId], {
    findParcel: table(orders, (id) => `The order book has no order called ${id}`),
    trackParcel: tracker(parcels)
  })
