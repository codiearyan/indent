import { shippingFor } from '../src/shipping.ts'

// With giftNote added to Order in order.ts, shippingFor takes an order with one
const pence: number = shippingFor({ id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false, giftNote: 'Happy birthday' })
