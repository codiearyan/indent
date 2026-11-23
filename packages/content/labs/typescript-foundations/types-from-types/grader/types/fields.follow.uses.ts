import { cell, type Tin, type TinField } from '../src/catalogue.ts'

const keemun: Tin = {
  id: 'T-31',
  blend: 'Morning Keemun',
  size: 500,
  pence: 990,
  stock: 3,
  origin: 'Anhui'
}

// With origin added to Tin, origin is a TinField too
const origin: TinField = 'origin'
// and cell takes it
const grown: string = cell(keemun, 'origin')
