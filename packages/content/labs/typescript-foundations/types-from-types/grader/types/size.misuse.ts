import { tinsOfSize, type Size, type Tin } from '../src/catalogue.ts'

const tins: Tin[] = [{ id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }]

// @ts-expect-error: the shop sells no 300 g tin, so 300 is not a Size
const odd: Size = 300
// @ts-expect-error: tinsOfSize takes only a size a tin can have
tinsOfSize(tins, 75)
// @ts-expect-error: a size is a number of grams, not text
tinsOfSize(tins, '125')
