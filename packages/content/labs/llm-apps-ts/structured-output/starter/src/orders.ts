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
  throw new Error('Not implemented')
}

export function validateOrder(value: unknown): string[] {
  throw new Error('Not implemented')
}

export async function extractOrder(email: string, client: OpenAI = new OpenAI()): Promise<Order> {
  throw new Error('Not implemented')
}
