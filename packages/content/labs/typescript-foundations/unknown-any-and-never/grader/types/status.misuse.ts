import { notHandled, statusLine } from '../src/cafe.ts'

// @ts-expect-error: a real status is not left over, so notHandled refuses it
notHandled('paid')
// @ts-expect-error: a status the cafe does not have is refused
statusLine('lost')
// @ts-expect-error: a status line is text, so it is not a number
const asNumber: number = statusLine('new')
