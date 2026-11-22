import { deliveryLine } from '../src/packing.ts'

// @ts-expect-error: a kind of delivery the shop does not have is refused
deliveryLine({ kind: 'drone' })
// @ts-expect-error: a post delivery without its address is refused
deliveryLine({ kind: 'post' })
// @ts-expect-error: a delivery line is text, so it is not a number
const asNumber: number = deliveryLine({ kind: 'collect' })
