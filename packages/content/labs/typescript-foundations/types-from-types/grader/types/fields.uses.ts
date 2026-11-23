import { cell, type Tin, type TinField } from '../src/catalogue.ts'

const keemun: Tin = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }

// The name of every property of a tin is a TinField
const columns: TinField[] = ['id', 'blend', 'size', 'pence', 'stock']
// cell takes the name of any property of a tin
const row: string = cell(keemun, 'pence') + cell(keemun, 'id')
