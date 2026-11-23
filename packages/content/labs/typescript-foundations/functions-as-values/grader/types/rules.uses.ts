import { applyRules, fridayOff, type PriceRule } from '../src/offers.ts'

// A price rule is a function from pence to pence, its parameter typed by the name
const fiftyOff: PriceRule = (pence) => pence - 50
const price: number = applyRules(2000, [fridayOff, fiftyOff, (pence) => pence * 2])
const friday: number = fridayOff(2000)
