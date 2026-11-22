import { shelfLine } from '../src/packing.ts'

// @ts-expect-error: a count written as text is refused
shelfLine('7')
// @ts-expect-error: a shelf not counted yet is null, not undefined
shelfLine(undefined)
