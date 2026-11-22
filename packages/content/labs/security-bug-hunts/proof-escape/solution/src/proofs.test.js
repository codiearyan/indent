import { describe, expect, it } from 'vitest'
import { PROOFS_DIR } from './folders.js'
import { readProof } from './proofs.js'

describe('readProof', () => {
  it('never reads outside the proofs folder', () => {
    expect(readProof(PROOFS_DIR, '../config/mail.json')).toBeNull()
    expect(readProof(PROOFS_DIR, '2041/../../config/mail.json')).toBeNull()
  })

  it('does not read a folder beside it whose name starts the same', () => {
    expect(readProof(PROOFS_DIR, '../proofs-staff/2041-costs.txt')).toBeNull()
  })

  it('still reads real proofs', () => {
    expect(readProof(PROOFS_DIR, '2041/front.txt')).toContain('PROOF 2041')
  })
})
