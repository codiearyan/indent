import OpenAI from 'openai'

export const SYSTEM_PROMPT =
  'You sort Pebblebrook Plants support tickets. Reply with a JSON object: ' +
  '{"category": shipping | refund | plant-care | account | other, "urgency": 1 to 5, ' +
  '"orderId": "PB-12345" or null, "summary": one sentence}.'

export async function triageJson(
  text: string,
  model = 'evals-triage-json',
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
