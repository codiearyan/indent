import { shelfLine, tinsToOrder, type Shelf } from '../src/stock.ts'

const yunnan: Shelf = { blend: 'Golden Yunnan', tins: 4, reorderAt: 6 }

// @ts-expect-error: the tins to bring a shelf up to are a number, not text
tinsToOrder(yunnan, '10')
// @ts-expect-error: a blend alone is not a shelf
tinsToOrder({ blend: 'Golden Yunnan' }, 10)
// @ts-expect-error: shelfLine takes a shelf, not the name of a blend
shelfLine('Golden Yunnan')
