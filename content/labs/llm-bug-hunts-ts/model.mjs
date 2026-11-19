// Local model behavior for the Kestrel Parcels support assistant. Replies depend only on the request.
import { countTokens } from '../../kit/tokens.mjs'

export const CHAT_CONTEXT_TOKENS = 400

const lastUser = (request) =>
  [...(request.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? ''

const words = (text, n) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n)
    .join(' ')
    .replace(/[.,!?;:]+$/, '')

export function summarize(complaint) {
  const sentences = complaint
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const points = sentences.map((s, i) => ` ${i + 1}) ${words(s, 8)}.`).join('')
  return `Summary: ${sentences.length} point${sentences.length === 1 ? '' : 's'}.${points}`
}

export function extract(message) {
  const trackingId = message.match(/\bKP-\d{5}\b/)?.[0] ?? null
  const action = /cancel/i.test(message)
    ? 'cancel'
    : /reroute/i.test(message)
      ? 'reroute'
      : /address|neighbou?r|deliver (it )?to/i.test(message)
        ? 'redirect'
        : /tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|reschedul|later/i.test(
              message
            )
          ? 'reschedule'
          : null
  if (!action) {
    return 'I could not find a delivery change in that message. What would you like to do with your parcel?'
  }
  const json = JSON.stringify({ action, trackingId })
  if (/please/i.test(message)) return '```json\n' + JSON.stringify({ action, trackingId }, null, 2) + '\n```'
  if (message.includes('!')) return `Sure! Here is the request I found:\n${json}`
  return json
}

export function chat(request) {
  const messages = request.messages ?? []
  const used = messages.reduce((sum, m) => sum + countTokens(String(m.content ?? '')), 0)
  if (used > CHAT_CONTEXT_TOKENS) {
    throw Object.assign(
      new Error(
        `This model's maximum context length is ${CHAT_CONTEXT_TOKENS} tokens, but your messages used ${used} tokens.`
      ),
      { status: 400, code: 'context_length_exceeded' }
    )
  }
  const persona = messages[0]?.role === 'system' && /\bKes\b/.test(String(messages[0].content))
  return `${persona ? 'Kes here. ' : ''}About "${words(lastUser(request), 6)}": I checked our depot log and your parcel is moving. I will keep you posted.`
}

export const models = {
  'kes-summarize-1': (request) => summarize(lastUser(request)),
  'kes-extract-1': (request) => extract(lastUser(request)),
  'kes-chat-1': chat
}
