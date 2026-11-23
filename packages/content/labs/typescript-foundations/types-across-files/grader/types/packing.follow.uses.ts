import { packingSlip } from '../src/packing.ts'

// With giftNote added to Order in order.ts, packingSlip takes an order with one
const slip: string = packingSlip({ id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false, giftNote: 'Happy birthday' })
