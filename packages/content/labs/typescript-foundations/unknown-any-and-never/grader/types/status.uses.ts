import { notHandled, statusLine } from '../src/cafe.ts'

// Each status gives a line of text
const line: string = statusLine('new')
// notHandled takes what is left once every kind is handled, and gives back never
declare const nothing: never
const left: never = notHandled(nothing)
