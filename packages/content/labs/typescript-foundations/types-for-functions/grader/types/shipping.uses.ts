import { shippingFor } from '../src/pricing.ts'

// The grams and whether it goes express give the shipping in pence
const slow: number = shippingFor(1200, false)
const fast: number = shippingFor(300, true)
