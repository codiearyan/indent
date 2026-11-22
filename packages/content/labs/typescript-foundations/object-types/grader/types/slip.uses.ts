import { slipText } from '../src/orders.ts'

// An order with a gift note gives a slip
const withNote: string = slipText({ id: 'OK-3001', giftNote: 'With love' })
// An order without one gives a slip too
const plain: string = slipText({ id: 'OK-3002' })
