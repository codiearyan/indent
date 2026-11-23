import type { Order } from '../src/order.ts'
import { shippingFor } from '../src/shipping.ts'

// shippingFor takes an Order from order.ts and gives back pence
const order: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false }
const pence: number = shippingFor(order)
