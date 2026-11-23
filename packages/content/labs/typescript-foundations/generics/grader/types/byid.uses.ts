import { byId } from '../src/lists.ts'

const orders = [
  { id: 'OK-3001', tins: 2 },
  { id: 'OK-3002', tins: 6 }
]
const customers = [{ id: 'C-12', name: 'Ottoline Marsh', email: 'ottoline@example.com' }]

// What byId finds keeps every property of what the list holds
const tins: number | undefined = byId(orders, 'OK-3002')?.tins
const email: string | undefined = byId(customers, 'C-12')?.email
const order: { id: string; tins: number } | undefined = byId(orders, 'OK-3001')
