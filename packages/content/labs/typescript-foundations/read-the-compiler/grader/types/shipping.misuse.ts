import { shippingFor } from '../src/order-sheet.ts'

// @ts-expect-error: the zone of an order cannot be left out
shippingFor(500)
