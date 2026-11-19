// Turning order emails into orders. All three tasks live in this file.
//
// 1. parseJsonReply(text): find the JSON in a model reply (inside a ``` fence if there is one,
//    otherwise from the first { to the last }) and parse it. Throw an Error whose message contains
//    "not valid JSON" when there is nothing to parse or it does not parse.
// 2. validateOrder(value): check the parsed value by hand and return a list of problems, one per
//    wrong field, each naming the field. An empty list means it is a valid Order.
// 3. extractOrder(email, client): ask MODEL with ORDER_PROMPT, parse and validate the reply. If
//    anything is wrong, send one repair message that lists the problems and try once more. Throw an
//    Error containing "invalid order" if the second reply is still wrong.
// `node src/demo.ts` runs extractOrder over the sample emails.
import OpenAI from 'openai'

export const MODEL = 'llmapps-order-1'
export const POT_SIZES = ['small', 'medium', 'large'] as const

export type PotSize = (typeof POT_SIZES)[number]
export type Message = OpenAI.Chat.ChatCompletionMessageParam

export interface Order {
  plant: string
  quantity: number
  potSize: PotSize
  giftWrap: boolean
}

export const ORDER_PROMPT =
  'You read order emails for Fernhollow, a plant shop. Reply with JSON only, in this shape: ' +
  '{"plant": string, "quantity": number, "potSize": "small" | "medium" | "large", "giftWrap": boolean}'

export function parseJsonReply(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const candidate = fenced ? fenced[1] : start >= 0 && end > start ? text.slice(start, end + 1) : ''
  try {
    return JSON.parse(candidate)
  } catch (err) {
    throw new Error(`The reply is not valid JSON: ${(err as Error).message}`)
  }
}

export function validateOrder(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ['The reply must be a JSON object.']
  }
  const order = value as Record<string, unknown>
  const problems: string[] = []
  if (typeof order.plant !== 'string' || order.plant.trim() === '') {
    problems.push('plant must be a non-empty string.')
  }
  if (typeof order.quantity !== 'number' || !Number.isInteger(order.quantity) || order.quantity < 1) {
    problems.push('quantity must be a whole number of at least 1, written as a number.')
  }
  if (!POT_SIZES.includes(order.potSize as PotSize)) {
    problems.push('potSize must be one of "small", "medium" or "large".')
  }
  if (typeof order.giftWrap !== 'boolean') problems.push('giftWrap must be true or false.')
  return problems
}

function check(reply: string): { order?: Order; problems: string[] } {
  let value: unknown
  try {
    value = parseJsonReply(reply)
  } catch (err) {
    return { problems: [(err as Error).message] }
  }
  const problems = validateOrder(value)
  return problems.length ? { problems } : { order: value as Order, problems }
}

async function complete(client: OpenAI, messages: Message[]): Promise<string> {
  const res = await client.chat.completions.create({ model: MODEL, messages })
  return res.choices[0].message.content ?? ''
}

export async function extractOrder(email: string, client: OpenAI = new OpenAI()): Promise<Order> {
  const messages: Message[] = [
    { role: 'system', content: ORDER_PROMPT },
    { role: 'user', content: email }
  ]
  const first = await complete(client, messages)
  const attempt = check(first)
  if (attempt.order) return attempt.order

  messages.push(
    { role: 'assistant', content: first },
    {
      role: 'user',
      content: `Your reply had these problems:\n- ${attempt.problems.join('\n- ')}\nSend the corrected order again.`
    }
  )
  const retry = check(await complete(client, messages))
  if (retry.order) return retry.order
  throw new Error(`Model returned an invalid order after one repair: ${retry.problems.join(' ')}`)
}
