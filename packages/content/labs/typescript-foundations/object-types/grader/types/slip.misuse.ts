import { slipText } from '../src/orders.ts'

// @ts-expect-error: an order without its id is refused
slipText({ giftNote: 'With love' })
// @ts-expect-error: a gift note is text, so a number is refused
slipText({ id: 'OK-3001', giftNote: 5 })
// @ts-expect-error: a slip is text, so it is not a number
const asNumber: number = slipText({ id: 'OK-3002' })
