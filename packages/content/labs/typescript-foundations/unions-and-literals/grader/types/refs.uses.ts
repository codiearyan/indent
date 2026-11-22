import { refLine, todaysRefs } from '../src/delivery.ts'

// An old ref is a number and a new one is text, and both give a line of text
const old: string = refLine(1043)
const recent: string = refLine('OK-2210')
// The list takes refs of either kind, and each one can be passed to refLine
todaysRefs.push(1043)
todaysRefs.push('OK-2210')
const first: string = refLine(todaysRefs[0])
