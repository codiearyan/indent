import { firstOrder } from '../src/orders.ts'

// The id can be read, and the tins can still change
const id: string = firstOrder.id
firstOrder.tins = 5
const tins: number = firstOrder.tins
