import { todaysDeliveries, type Delivery } from '../src/delivery.ts'

// @ts-expect-error: a locker delivery without its locker number is refused
const noLocker: Delivery = { kind: 'locker' }
// @ts-expect-error: a post delivery has no locker number
const mixed: Delivery = { kind: 'post', address: '12 Weir Road, Lowmarsh', locker: 'L-04' }
// @ts-expect-error: a way to deliver the shop does not have is refused
const drone: Delivery = { kind: 'drone' }
// @ts-expect-error: 'Locker' with a capital is not one of the kinds
const capital: Delivery = { kind: 'Locker', locker: 'L-04' }
// @ts-expect-error: the list holds deliveries, so plain text is refused
todaysDeliveries.push('collect')
