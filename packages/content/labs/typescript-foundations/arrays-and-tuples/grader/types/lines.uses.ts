import { orderLines } from '../src/picking.ts'

// Pairs of a blend and a number of tins give a list of text
const lines: string[] = orderLines([['Hearth Assam', 2], ['Morning Keemun', 1]])
// An order with no lines gives an empty list
const none: string[] = orderLines([])
// Pairs made somewhere else can be passed too
const saved: [string, number][] = [['Smoky Lapsang', 3]]
const more: string[] = orderLines(saved)
