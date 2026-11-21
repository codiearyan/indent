import { describe, expect, it } from 'vitest'
import { ChatSession, SYSTEM_PROMPT } from './chat.ts'
import { questions } from './questions.ts'

describe('ChatSession', () => {
  it('answers every question in a long conversation', async () => {
    const session = new ChatSession()
    for (const question of questions) {
      expect(await session.send(question)).toBeTruthy()
    }
  })

  it('keeps the system prompt after many turns', async () => {
    const session = new ChatSession()
    let reply = ''
    for (const question of questions) reply = await session.send(question)
    expect(reply).toMatch(/^Kes here\./)
    expect(session.history[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT })
  })
})
