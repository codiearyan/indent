import { shipTo, type Address, type Parcel } from '../src/orders.ts'

// An address, and a parcel that goes to it
const to: Address = { name: 'Fen Okafor', street: '12 Weir Road', town: 'Lowmarsh', postcode: 'OH9 1AB' }
const parcel: Parcel = { orderId: 'OK-5120', grams: 600, to }
const town: string = parcel.to.town
const back: Address = parcel.to
const line: string = shipTo(parcel)
