import { type NewTin } from '../src/catalogue.ts'

// @ts-expect-error: with origin added to Tin, a NewTin without one is short
const old: NewTin = { blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }
