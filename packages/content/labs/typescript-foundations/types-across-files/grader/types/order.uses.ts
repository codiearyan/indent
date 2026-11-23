import type { Order } from '../src/order.ts'

// An order as the form sends it
const order: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false }
// Each property has its own type
const id: string = order.id
const blend: string = order.blend
const tins: number = order.tins
const grams: number = order.grams
const express: boolean = order.express
