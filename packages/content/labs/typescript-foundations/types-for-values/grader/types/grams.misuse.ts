import { gramsPerTin, orderGrams, tins } from '../src/order-form.ts'

// @ts-expect-error: the tins are a number now, so they are not text
const tinsText: string = tins
// @ts-expect-error: the grams per tin are a number now, so they are not text
const eachText: string = gramsPerTin
// @ts-expect-error: the grams in the order are a number, so they are not text
const totalText: string = orderGrams
