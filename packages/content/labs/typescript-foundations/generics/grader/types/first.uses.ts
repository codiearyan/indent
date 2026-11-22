import { firstOf } from '../src/lists.ts'

// The first of a list keeps the type of the list's items
const blend: string | undefined = firstOf(['Smoky Lapsang', 'Morning Keemun'])
const grams: number | undefined = firstOf([500, 100])
const order: { id: string; tins: number } | undefined = firstOf([{ id: 'OK-3001', tins: 2 }])
const tins: number | undefined = firstOf([{ id: 'OK-3001', tins: 2 }])?.tins
