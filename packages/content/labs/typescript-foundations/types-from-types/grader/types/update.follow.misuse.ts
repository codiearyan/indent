import { updateTin, type Tin } from '../src/catalogue.ts'

const keemun: Tin = {
  id: 'T-31',
  blend: 'Morning Keemun',
  size: 250,
  pence: 990,
  stock: 3,
  origin: 'Anhui'
}

// @ts-expect-error: origin is text, so a change to it must be text too
updateTin(keemun, { origin: 4 })
