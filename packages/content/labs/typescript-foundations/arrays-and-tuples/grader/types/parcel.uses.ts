import { parcelGrams } from '../src/picking.ts'

// A list of tin weights gives a weight
const parcel: number = parcelGrams([125, 250, 50])
// An empty parcel can be weighed too
const empty: number = parcelGrams([])
// A list made somewhere else can be weighed
const weights: number[] = [500, 500]
const heavy: number = parcelGrams(weights)
