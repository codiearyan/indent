import { describe, expect, it } from 'vitest'
import { fitName, nameLength, sameName } from './names.js'
import { LABEL_WIDTH, onFile, pasted } from './contacts.js'

describe('the ticket', () => {
  it('prints the pasted name whole on a label', () => {
    expect(sameName(fitName(pasted, LABEL_WIDTH), onFile)).toBe(true)
  })

  it('counts the characters a person sees', () => {
    expect(nameLength(pasted)).toBe(15)
    expect(nameLength('Sio\u0302n')).toBe(4)
  })

  it('cuts a name with a two-mark accent after its accent', () => {
    expect(fitName('Siân Pryce'.normalize('NFD'), 3).normalize('NFC')).toBe('Siâ')
  })

  it('knows two spellings of one name', () => {
    expect(sameName(pasted, onFile)).toBe(true)
  })
})

describe('next door', () => {
  it('cuts a Japanese name between characters', () => {
    expect(fitName('𠮷田 Haruka', 1)).toBe('𠮷')
  })

  it('counts a Japanese name', () => {
    expect(nameLength('𠮷田 Haruka')).toBe(9)
  })
})
