import { splitCode } from '../src/picking.ts'

// The first part is text and the second is a number
const [blend, grams] = splitCode('MK-50')
const shout: string = blend.toUpperCase()
const double: number = grams * 2
const pair: [string, number] = splitCode('SL-125')
