import { packingSlip } from '../src/packing.ts'

// @ts-expect-error: an order without its blend and grams is not an Order
packingSlip({ id: 'OK-3101', tins: 2, express: false })
