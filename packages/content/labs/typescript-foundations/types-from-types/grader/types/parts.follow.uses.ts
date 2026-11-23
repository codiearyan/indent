import { shelfLabel, withId, type NewTin, type Tin } from '../src/catalogue.ts'

// With origin and 500 g tins added to Tin, a NewTin has them too
const form: NewTin = { blend: 'Morning Keemun', size: 500, pence: 990, stock: 3, origin: 'Anhui' }
const keemun: Tin = withId(form, 'T-31')
// A label stays the blend and the size, and can be for a 500 g tin
const big: string = shelfLabel({ blend: 'Morning Keemun', size: 500 })
