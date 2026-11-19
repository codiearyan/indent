import { describe, expect, it } from 'vitest'
import { parseRequest } from './parse.ts'
import { messages } from './messages.ts'

describe('parseRequest', () => {
  it('parses a plain JSON reply', async () => {
    expect(await parseRequest(messages.clean)).toEqual({
      ok: true,
      request: { action: 'reschedule', trackingId: 'KP-20481' }
    })
  })

  it('parses JSON inside a code fence or chatty text', async () => {
    expect((await parseRequest(messages.fenced)).ok).toBe(true)
    expect((await parseRequest(messages.chatty)).ok).toBe(true)
  })

  it('returns ok: false when the reply is not JSON', async () => {
    expect((await parseRequest(messages.noRequest)).ok).toBe(false)
  })

  it('returns ok: false when the JSON has the wrong shape', async () => {
    expect((await parseRequest(messages.missingId)).ok).toBe(false)
    expect((await parseRequest(messages.unknownAction)).ok).toBe(false)
  })
})
