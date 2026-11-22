import { todaysDeliveries, type Delivery } from '../src/delivery.ts'

// Each way to deliver, with what it needs
const post: Delivery = { kind: 'post', address: '12 Weir Road, Lowmarsh' }
const locker: Delivery = { kind: 'locker', locker: 'L-04' }
const collect: Delivery = { kind: 'collect' }
todaysDeliveries.push(post, locker, collect)
// Every delivery has a kind, and it is one of the three words
const kind: 'post' | 'locker' | 'collect' = todaysDeliveries[0].kind
