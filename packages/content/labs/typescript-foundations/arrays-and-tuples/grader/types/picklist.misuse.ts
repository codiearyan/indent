import { pickList } from '../src/picking.ts'

// @ts-expect-error: an order id is text, so a number cannot be added
pickList.push(2071)
// @ts-expect-error: the picking list holds text, so it is not a list of numbers
const counts: number[] = pickList
