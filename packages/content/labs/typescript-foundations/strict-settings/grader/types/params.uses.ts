import { shelfLine, tinsToOrder, type Shelf } from '../src/stock.ts'

const yunnan: Shelf = { blend: 'Golden Yunnan', tins: 4, reorderAt: 6 }

// tinsToOrder takes a shelf and a number of tins, and gives back a number
const order: number = tinsToOrder(yunnan, 10)
// shelfLine takes a shelf and gives back text
const line: string = shelfLine(yunnan)
