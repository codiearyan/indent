import { numbered } from '../src/offers.ts'

// A callback may use only the line
const plain: string[] = numbered(['Frost Sencha'], (line) => line.toUpperCase())
// A callback may use the line and its position, which is always a number
const marked: string[] = numbered(['Frost Sencha'], (line, at) => `${at.toFixed(0)}. ${line}`)
