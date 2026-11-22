import { blendName, caffeineFree, gramsInTin } from '../src/order-form.ts'

// The blend name is text, and may hold any blend
const name: string = blendName
const other: typeof blendName = 'Morning Keemun'
// The grams are a number, and may hold any weight
const grams: number = gramsInTin
const heavier: typeof gramsInTin = 250
// Caffeine free is true or false
const free: boolean = caffeineFree
const notFree: typeof caffeineFree = true
