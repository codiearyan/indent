import { tinsOfSize, type Size, type Tin } from '../src/catalogue.ts'

const tins: Tin[] = [
  { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 },
  { id: 'T-32', blend: 'Nilgiri Frost', size: 50, pence: 450, stock: 0 }
]

// Every size a tin can have is a Size
const sizes: Size[] = [50, 125, 250]
// tinsOfSize takes a size a tin can have, and gives back tins
const large: Tin[] = tinsOfSize(tins, 250)
const same: Tin[] = tinsOfSize(tins, tins[0].size)
