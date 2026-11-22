import { pickList } from '../src/picking.ts'

// The picking list is a list of order ids, and more can be added
const ids: string[] = pickList
pickList.push('OK-2071')
const first: string = pickList[0]
