import { percentOff } from '../src/offers.ts'

// percentOff gives back a function from pence to pence
const rule: (pence: number) => number = percentOff(10)
const after: number = percentOff(15)(2000)
