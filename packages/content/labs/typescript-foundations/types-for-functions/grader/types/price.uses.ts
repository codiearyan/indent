import { tinPrice } from '../src/pricing.ts'

// Grams and a price per 100 g give a price in pence
const price: number = tinPrice(250, 640)
const small: number = tinPrice(50, 1290)
