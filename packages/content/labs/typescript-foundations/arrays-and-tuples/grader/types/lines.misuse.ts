import { orderLines } from '../src/picking.ts'

// @ts-expect-error: in a line the blend comes first and the tins second
orderLines([[2, 'Hearth Assam']])
// @ts-expect-error: a line is a pair, not a blend on its own
orderLines(['Hearth Assam'])
// @ts-expect-error: a line has two parts, not three
orderLines([['Hearth Assam', 2, 'gift']])
// @ts-expect-error: the result is a list of text, not one text
const one: string = orderLines([['Hearth Assam', 2]])
