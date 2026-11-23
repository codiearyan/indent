import { updateTin, type Tin } from '../src/catalogue.ts'

const keemun: Tin = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }

// @ts-expect-error: a stock is a number, so a change to it must be a number too
updateTin(keemun, { stock: '3' })
// @ts-expect-error: a tin has no colour to change
updateTin(keemun, { colour: 'green' })
// @ts-expect-error: a change of size must be a size a tin can have
updateTin(keemun, { size: 300 })
// @ts-expect-error: what comes back is a tin, and a tin has no colour
updateTin(keemun, { stock: 1 }).colour
