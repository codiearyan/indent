import { reorderNote, tinsOf, type Shelf } from '../src/stock.ts'

const yunnan: Shelf = { blend: 'Golden Yunnan', tins: 4, reorderAt: 6 }

// tinsOf always gives back a number
const tins: number = tinsOf([yunnan], 'Morning Keemun')
// reorderNote gives back text, or undefined
const note: string | undefined = reorderNote(yunnan)
