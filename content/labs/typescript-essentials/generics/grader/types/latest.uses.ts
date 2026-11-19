import { findById, latest } from '../src/latest.ts'

const notes = [{ id: 'n1', updatedAt: 3, text: 'Chain swapped' }]
const newestText: string | undefined = latest(notes)?.text
const foundTime: number | undefined = findById(notes, 'n1')?.updatedAt
const photos: readonly { id: string; updatedAt: number; url: string }[] = []
const photoUrl: string | undefined = latest(photos)?.url
