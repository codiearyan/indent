import { shippingFor } from '../src/order-sheet.ts'

// A weight in grams and a zone give the shipping in pence
const pence: number = shippingFor(500, 'national')
