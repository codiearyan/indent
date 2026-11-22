import { refLabel } from '../src/packing.ts'

// @ts-expect-error: true or false is not a ref
refLabel(true)
// @ts-expect-error: a label is text, so it is not a number
const asNumber: number = refLabel(51)
