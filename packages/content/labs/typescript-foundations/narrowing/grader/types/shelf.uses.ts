import { shelfLine } from '../src/packing.ts'

// A counted shelf and one not counted yet both give a line
const counted: string = shelfLine(7)
const notYet: string = shelfLine(null)
