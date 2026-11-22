import { deliveryLine } from '../src/packing.ts'

// A delivery of each kind gives a line of text
const post: string = deliveryLine({ kind: 'post', address: '12 Weir Road, Lowmarsh' })
const locker: string = deliveryLine({ kind: 'locker', locker: 'L-04' })
const collect: string = deliveryLine({ kind: 'collect' })
