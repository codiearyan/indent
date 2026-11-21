import OpenAI from 'openai'

export const MODEL = 'kes-summarize-1'
export const MAX_TOKENS = 48

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
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: buildMessages(complaint)
  })
  return res.choices[0].message.content ?? ''
}
