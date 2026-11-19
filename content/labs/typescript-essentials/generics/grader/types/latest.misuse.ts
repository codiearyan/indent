import { findById, latest } from '../src/latest.ts'

const notes = [{ id: 'n1', updatedAt: 3, text: 'Chain swapped' }]
// @ts-expect-error: latest needs items with an updatedAt
latest([{ text: 'no time' }])
// @ts-expect-error: updatedAt must be a number
latest([{ updatedAt: '2026-11-19' }])
// @ts-expect-error: findById needs items with string ids
findById([{ id: 7 }], '7')
// @ts-expect-error: the result keeps the item type, and text is a string
const wrongText: number | undefined = latest(notes)?.text
// @ts-expect-error: findById can find nothing, so its result can be undefined
const sure: { id: string } = findById(notes, 'n9')
