import { firstOf } from '../src/lists.ts'

// @ts-expect-error: the first of a list of text is not a number
const asNumber: number | undefined = firstOf(['Smoky Lapsang'])
// @ts-expect-error: the first of a list of numbers is not text
const asText: string | undefined = firstOf([500])
// @ts-expect-error: a list may be empty, so its first may be undefined
const always: string = firstOf(['Smoky Lapsang'])
// @ts-expect-error: an order has no name, and the first order keeps that
const name = firstOf([{ id: 'OK-3001', tins: 2 }])?.name
