import { describe, expect, it } from 'vitest'
import { openDb } from './db.js'
import { signIn } from './signIn.js'

function attempt(form) {
  const lines = []
  const result = signIn(openDb(), (line) => lines.push(line), form)
  return { lines, result }
}

describe('signIn', () => {
  it('keeps the password and the token out of the log', () => {
    const form = { email: 'greta@example.com', password: 'blue-heron-17' }
    const { lines, result } = attempt(form)
    expect(result.ok).toBe(true)
    for (const line of lines) {
      expect(line).not.toContain(form.password)
      expect(line).not.toContain(result.token)
    }
  })

  it('keeps a wrong password out of the log and the message', () => {
    const form = { email: 'cosmo@example.com', password: 'tin-lantern-5' }
    const { lines, result } = attempt(form)
    expect(result.ok).toBe(false)
    for (const line of [...lines, result.message]) expect(line).not.toContain(form.password)
  })
})
