import { nextStatus, type Status } from '../src/delivery.ts'

// @ts-expect-error: 'shipped' is not one of the three statuses
nextStatus('shipped')
// @ts-expect-error: 'Sent' with a capital is not a Status
const capital: Status = 'Sent'
// @ts-expect-error: a status is text, so it is not a number
const asNumber: number = nextStatus('paid')
