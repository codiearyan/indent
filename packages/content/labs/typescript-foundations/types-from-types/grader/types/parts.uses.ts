import { shelfLabel, withId, type NewTin, type ShelfLabel, type Tin } from '../src/catalogue.ts'

// A NewTin has everything a tin has but its id, and withId makes it a tin
const form: NewTin = { blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }
const keemun: Tin = withId(form, 'T-31')
// A ShelfLabel has the blend and the size
const label: ShelfLabel = { blend: 'Nilgiri Frost', size: 50 }
const text: string = shelfLabel(label)
// A whole tin has what a label needs, so it can be passed too
const fromTin: string = shelfLabel(keemun)
