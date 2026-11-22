import { packedLine } from '../src/pricing.ts'

// @ts-expect-error: the order id comes first, the tins second
packedLine(4, 'OK-2207')
// @ts-expect-error: the line is text, so it is not a number
const asNumber: number = packedLine('OK-2207', 4)
