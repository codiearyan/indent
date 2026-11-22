import { lineCount } from '../src/packing.ts'

// @ts-expect-error: a tin line without its tins is refused
lineCount({ blend: 'Frost Sencha' })
// @ts-expect-error: an empty object is neither kind of line
lineCount({})
// @ts-expect-error: a count is a number, so it is not text
const asText: string = lineCount({ blend: 'Frost Sencha', tins: 5 })
