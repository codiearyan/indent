import { reorderNote, type Shelf } from '../src/stock.ts'

const yunnan: Shelf = { blend: 'Golden Yunnan', tins: 4, reorderAt: 6 }

// @ts-expect-error: a full shelf has no note, so the note may be undefined
const note: string = reorderNote(yunnan)
