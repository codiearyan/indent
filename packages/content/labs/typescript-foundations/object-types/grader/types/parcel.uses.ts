import { parcelFor } from '../src/orders.ts'

// A parcel has an order id, a weight and whether it is heavy
const parcel = parcelFor('OK-4100', 2500)
const id: string = parcel.orderId
const grams: number = parcel.grams
const heavy: boolean = parcel.heavy
