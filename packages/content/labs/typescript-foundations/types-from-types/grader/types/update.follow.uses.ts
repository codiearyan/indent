import { updateTin, type Tin } from '../src/catalogue.ts'

const keemun: Tin = {
  id: 'T-31',
  blend: 'Morning Keemun',
  size: 250,
  pence: 990,
  stock: 3,
  origin: 'Anhui'
}

// With origin and 500 g tins added to Tin, they can be changed too
const moved: Tin = updateTin(keemun, { origin: 'Qimen' })
const bigger: Tin = updateTin(keemun, { size: 500 })
