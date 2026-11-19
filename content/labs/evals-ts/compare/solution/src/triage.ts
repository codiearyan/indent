import OpenAI from 'openai'

export const SYSTEM_PROMPT =
  'You sort Pebblebrook Plants support tickets. ' +
  'Reply with one category: shipping, refund, plant-care, account or other.'

export async function triage(
  text: string,
  model: string,
  client: OpenAI = new OpenAI()
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text }
    ]
  })
  return res.choices[0].message.content ?? ''
}
