import { packingSlip } from '../src/packing.ts'

// @ts-expect-error: with giftNote added to Order in order.ts, an order without one is short
packingSlip({ id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false })
