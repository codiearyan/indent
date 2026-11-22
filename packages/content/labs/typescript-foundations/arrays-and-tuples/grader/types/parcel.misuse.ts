import { parcelGrams } from '../src/picking.ts'

// @ts-expect-error: one weight on its own is not a list
parcelGrams(125)
// @ts-expect-error: weights written as text are refused
parcelGrams(['125', '250'])
// @ts-expect-error: one weight as text in the list is refused too
parcelGrams([125, '250'])
// @ts-expect-error: a weight is a number, so it is not text
const asText: string = parcelGrams([125])
