import type { Order } from '../src/order.ts'

// @ts-expect-error: an order needs its express, true or false
const noExpress: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500 }
// @ts-expect-error: tins are a number, not text
const textTins: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: '2', grams: 500, express: false }
// @ts-expect-error: express is true or false, not text
const textExpress: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: 'no' }
// @ts-expect-error: the form sends the grams, so an order has no weight
const weighed: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false, weight: 500 }
