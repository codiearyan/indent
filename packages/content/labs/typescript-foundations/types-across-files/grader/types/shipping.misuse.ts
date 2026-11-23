import { shippingFor } from '../src/shipping.ts'

// @ts-expect-error: an order without its blend and grams is not an Order
shippingFor({ id: 'OK-3101', tins: 2, express: false })
