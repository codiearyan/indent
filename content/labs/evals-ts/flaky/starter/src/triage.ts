import OpenAI from 'openai'

export const SYSTEM_PROMPT =
  'You sort Pebblebrook Plants support tickets. ' +
  'Reply with one category: shipping, refund, plant-care, account or other.'

// The seed picks one sample from the model. The same seed and input always give the same reply.
export async function triage(
  text: string,
  model: string,
  seed?: number,
  client: OpenAI = new OpenAI()
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    seed,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text }
    ]
  })
  return (res.choices[0].message.content ?? '').trim().toLowerCase()
}
