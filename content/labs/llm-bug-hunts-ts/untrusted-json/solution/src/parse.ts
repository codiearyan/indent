import OpenAI from 'openai'

export const MODEL = 'kes-extract-1'

export type DeliveryAction = 'reschedule' | 'redirect' | 'cancel'

export interface DeliveryRequest {
  action: DeliveryAction
  trackingId: string
}

export type ParseResult = { ok: true; request: DeliveryRequest } | { ok: false; reason: string }

const ACTIONS: string[] = ['reschedule', 'redirect', 'cancel']

export function buildMessages(message: string): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content:
        'Extract the delivery change from the customer message. Reply with JSON only: ' +
        '{"action": "reschedule" | "redirect" | "cancel", "trackingId": "KP-12345"}'
    },
    { role: 'user', content: message }
  ]
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end < start) return undefined
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return undefined
  }
}

function isDeliveryRequest(value: unknown): value is DeliveryRequest {
  if (typeof value !== 'object' || value === null) return false
  const { action, trackingId } = value as Record<string, unknown>
  return (
    typeof action === 'string' &&
    ACTIONS.includes(action) &&
    typeof trackingId === 'string' &&
    /^KP-\d{5}$/.test(trackingId)
  )
}

export async function parseRequest(
  message: string,
  client: OpenAI = new OpenAI()
): Promise<ParseResult> {
  const res = await client.chat.completions.create({ model: MODEL, messages: buildMessages(message) })
  const value = extractJson(res.choices[0].message.content ?? '')
  if (value === undefined) return { ok: false, reason: 'The reply did not contain a JSON object.' }
  if (!isDeliveryRequest(value)) {
    return { ok: false, reason: 'The JSON is missing a valid action or tracking id.' }
  }
  return { ok: true, request: { action: value.action, trackingId: value.trackingId } }
}
