import { shipTo, type Address, type Parcel } from '../src/orders.ts'

const to: Address = { name: 'Fen Okafor', street: '12 Weir Road', town: 'Lowmarsh', postcode: 'OH9 1AB' }
// @ts-expect-error: an address without its postcode is refused
const noPostcode: Address = { name: 'Fen Okafor', street: '12 Weir Road', town: 'Lowmarsh' }
// @ts-expect-error: the address of a parcel is an Address, not one line of text
const flat: Parcel = { orderId: 'OK-5120', grams: 600, to: '12 Weir Road, Lowmarsh' }
// @ts-expect-error: grams written as text are refused
const heavy: Parcel = { orderId: 'OK-5120', grams: '600', to }
// @ts-expect-error: shipTo refuses a parcel without an address
shipTo({ orderId: 'OK-5120', grams: 600 })
