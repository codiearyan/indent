import OpenAI from 'openai'

export const MODEL = 'kes-summarize-1'
export const MAX_TOKENS = 48
const MAX_ATTEMPTS = 3

export function buildMessages(complaint: string): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: 'Summarize this delivery complaint for the Kestrel Parcels support team as numbered points.'
    },
    { role: 'user', content: complaint }
  ]
}

export async function summarizeComplaint(
  complaint: string,
  client: OpenAI = new OpenAI()
): Promise<string> {
  let budget = MAX_TOKENS
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: budget,
      messages: buildMessages(complaint)
    })
    const choice = res.choices[0]
    if (choice.finish_reason !== 'length') return choice.message.content ?? ''
    budget *= 2
  }
  throw new Error(`Summary truncated: still cut off after ${MAX_ATTEMPTS} attempts`)
}
