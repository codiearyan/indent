import { updateTin, type Tin } from '../src/catalogue.ts'

const keemun: Tin = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }

// Changes may hold any of the properties of a tin, or none of them
const counted: Tin = updateTin(keemun, { stock: 0 })
const repriced: Tin = updateTin(keemun, { pence: 1200, size: 50, blend: 'Keemun Mao Feng' })
const same: Tin = updateTin(keemun, {})
