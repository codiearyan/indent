import OpenAI from 'openai'

export const DRAFT_MODEL = 'evals-draft-1'

export async function draftReply(ticket: string, client: OpenAI = new OpenAI()): Promise<string> {
  const res = await client.chat.completions.create({
    model: DRAFT_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Draft a short, kind reply to this Pebblebrook Plants support ticket.' },
      { role: 'user', content: ticket }
    ]
  })
  return res.choices[0].message.content ?? ''
}
