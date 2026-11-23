import { tinsFrom } from '../src/cafe.ts'

// Whatever the till sends may be passed in, and a number comes back
const sentAsNumber: number = tinsFrom(5)
const sentAsText: number = tinsFrom('5')
const sentAsNull: number = tinsFrom(null)
const sentMissing: number = tinsFrom(undefined)
const sentAsList: number = tinsFrom([5])
const sentAsTrue: number = tinsFrom(true)
const sentAsObject: number = tinsFrom({ tins: 5 })
const parsed: number = tinsFrom(JSON.parse('5'))
