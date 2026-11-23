import { type NewTin, type ShelfLabel } from '../src/catalogue.ts'

// @ts-expect-error: a NewTin has no id yet, withId gives it one
const early: NewTin = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }
// @ts-expect-error: a NewTin needs every property of a tin but the id, the stock too
const short: NewTin = { blend: 'Morning Keemun', size: 250, pence: 990 }
// @ts-expect-error: a label needs the blend
const blank: ShelfLabel = { size: 50 }
// @ts-expect-error: a label has only the blend and the size, no price
const priced: ShelfLabel = { blend: 'Nilgiri Frost', size: 50, pence: 450 }
// @ts-expect-error: a label's size is one a tin can have
const odd: ShelfLabel = { blend: 'Nilgiri Frost', size: 300 }
