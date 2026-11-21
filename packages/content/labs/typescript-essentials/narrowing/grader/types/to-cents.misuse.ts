import { toCents } from '../src/price.ts'

// @ts-expect-error: toCents should not accept a boolean
toCents(true)
// @ts-expect-error: toCents should not accept undefined
toCents(undefined)
// @ts-expect-error: toCents should not accept an object
toCents({ euros: 3 })
// @ts-expect-error: toCents can return null, so its result is not always a number
const sure: number = toCents('12')
// @ts-expect-error: toCents returns cents as a number, never text
const text: string | null = toCents(4)
