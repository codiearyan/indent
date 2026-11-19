import { describe, expect, it } from 'vitest'
import { errorMessage } from './utils'

describe('errorMessage', () => {
  it('drops the wrapper Electron adds to an error from the main process', () => {
    const error = new Error("Error invoking remote method 'ai:test': Error: Invalid API key")
    expect(errorMessage(error)).toBe('Invalid API key')
  })

  it('leaves other messages alone', () => {
    expect(errorMessage(new Error('Timed out'))).toBe('Timed out')
    expect(errorMessage('plain')).toBe('plain')
  })
})
