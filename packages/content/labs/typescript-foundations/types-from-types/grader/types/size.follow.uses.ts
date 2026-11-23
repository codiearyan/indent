import { tinsOfSize, type Size, type Tin } from '../src/catalogue.ts'

const tins: Tin[] = [
  { id: 'T-31', blend: 'Morning Keemun', size: 500, pence: 990, stock: 3, origin: 'Anhui' }
]

// With 500 g tins added to Tin, 500 is a Size too
const kilo: Size = 500
// and tinsOfSize finds them
const big: Tin[] = tinsOfSize(tins, 500)
