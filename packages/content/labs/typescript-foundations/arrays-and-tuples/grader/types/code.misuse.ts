import { splitCode } from '../src/picking.ts'

// @ts-expect-error: there are only two parts, so a third cannot be read
const [blend, grams, extra] = splitCode('MK-50')
// @ts-expect-error: the first part is text, so it is not a number
const asNumber: number = splitCode('MK-50')[0]
// @ts-expect-error: the second part is a number, so it is not text
const asText: string = splitCode('MK-50')[1]
