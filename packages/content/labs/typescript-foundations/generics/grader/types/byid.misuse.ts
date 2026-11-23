import { byId } from '../src/lists.ts'

const orders = [{ id: 'OK-3001', tins: 2 }]

// @ts-expect-error: things without an id cannot be found by id
byId([{ name: 'Ottoline Marsh' }], 'Ottoline Marsh')
// @ts-expect-error: an id is text, so things with a number for an id are refused
byId([{ id: 3001, tins: 2 }], '3001')
// @ts-expect-error: the id to look for is text, not a number
byId(orders, 3001)
// @ts-expect-error: an order has no name, and what byId finds keeps that
const name = byId(orders, 'OK-3001')?.name
// @ts-expect-error: there may be nothing with that id, so the result may be undefined
const always: { id: string; tins: number } = byId(orders, 'OK-3001')
