import OpenAI from 'openai'

export const MODEL = 'kes-extract-1'

export type DeliveryAction = 'reschedule' | 'redirect' | 'cancel'

export interface DeliveryRequest {
  action: DeliveryAction
  trackingId: string
}

export type ParseResult = { ok: true; request: DeliveryRequest } | { ok: false; reason: string }

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

export async function parseRequest(
  message: string,
  client: OpenAI = new OpenAI()
): Promise<ParseResult> {
  const res = await client.chat.completions.create({ model: MODEL, messages: buildMessages(message) })
  const request = JSON.parse(res.choices[0].message.content ?? '') as DeliveryRequest
  return { ok: true, request }
}
