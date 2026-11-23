import { cell, type Tin, type TinField } from '../src/catalogue.ts'

const keemun: Tin = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }
const typed: string = 'blend'

// @ts-expect-error: a tin has no colour, so 'colour' is not a TinField
const colour: TinField = 'colour'
// @ts-expect-error: cell takes only the name of a property of a tin
cell(keemun, 'price')
// @ts-expect-error: typed is any text, a string, and not every string names a property
const field: TinField = typed
