import type { Order } from '../src/order.ts'
import { packingSlip } from '../src/packing.ts'

// packingSlip takes an Order from order.ts and gives back text
const order: Order = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false }
const slip: string = packingSlip(order)
