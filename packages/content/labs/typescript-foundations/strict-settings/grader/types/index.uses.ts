import { firstToReorder, type Shelf } from '../src/stock.ts'

const shelves: Shelf[] = [{ blend: 'Golden Yunnan', tins: 4, reorderAt: 6 }]

// firstToReorder always gives back text
const blend: string = firstToReorder(shelves)
