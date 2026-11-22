import { parcelFor } from '../src/orders.ts'

// @ts-expect-error: a parcel has no property called weight
parcelFor('OK-4100', 2500).weight
// @ts-expect-error: heavy is true or false, so it is not text
const asText: string = parcelFor('OK-4100', 2500).heavy
// @ts-expect-error: grams written as text are refused
parcelFor('OK-4100', '2500')
