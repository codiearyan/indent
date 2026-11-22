import { describe, expect, it } from 'vitest'
import { renderOrderCard } from './orderCard.js'
import { readCard } from './staffScreen.js'

const order = (fields) => ({
  id: 2046,
  title: 'Gig posters',
  status: 'proof sent',
  customerName: 'Yusra Penhallow',
  note: '',
  ...fields
})

describe('renderOrderCard', () => {
  it('shows a note with angle brackets as text', () => {
    const seen = readCard(renderOrderCard(order({ note: 'Size A2 <not A3>.' })))
    expect(seen.note).toBe('Size A2 <not A3>.')
    expect(seen.tags).toEqual(['article', 'h2', 'p', 'p', 'p', 'form', 'input', 'button'])
  })

  it('keeps quotes inside the note field', () => {
    const note = '" autofocus onfocus="alert(1)'
    const seen = readCard(renderOrderCard(order({ note })))
    expect(seen.noteField).toBe(note)
    expect(seen.handlers).toEqual([])
  })
})
