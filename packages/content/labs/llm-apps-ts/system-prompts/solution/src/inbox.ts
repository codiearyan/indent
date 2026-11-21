// Steering Moss with a system prompt and examples. All three tasks live in this file.
//
// 1. LABEL_PROMPT and labelMessage(text, client): a system prompt that names all five LABELS and
//    asks for only the label. labelMessage sends it with the customer's text to MODEL and returns
//    the label. A reply that is not one of the labels (after trimming and lowercasing) throws.
// 2. TRIAGE_PROMPT and buildTriageMessages(text): a system message, then at least two worked
//    examples (a user message followed by an assistant reply in the exact triage line format),
//    then the customer's text as the last user message.
// 3. triage(text, client): send buildTriageMessages(text) and parse the reply line into a Triage
//    object. A reply that is not a triage line throws.
// `node src/demo.ts` runs all three over the sample inbox.
import OpenAI from 'openai'

export const MODEL = 'llmapps-sort-1'
export const LABELS = ['watering', 'light', 'pests', 'order', 'other'] as const

export type Label = (typeof LABELS)[number]
export type Urgency = 'high' | 'normal'
export type Message = OpenAI.Chat.ChatCompletionMessageParam

export interface Triage {
  label: Label
  plant: string
  urgency: Urgency
}

export const LABEL_PROMPT =
  'You sort customer messages for Fernhollow, a plant shop. ' +
  'Choose one label: watering, light, pests, order or other. Reply with only the label, in lowercase.'

export const TRIAGE_PROMPT =
  'You triage customer messages for Fernhollow, a plant shop. ' +
  'Reply with one line: the label, the plant and the urgency, exactly like the examples.'

const EXAMPLES: [string, string][] = [
  [
    'There are sticky aphids under the leaves of my monstera.',
    'label: pests | plant: monstera | urgency: normal'
  ],
  ['My fern is dying, the soil is bone dry! Please help.', 'label: watering | plant: fern | urgency: high']
]

const TRIAGE_LINE = /^label: (watering|light|pests|order|other) \| plant: ([a-z ]+) \| urgency: (high|normal)$/

const isLabel = (value: string): value is Label => (LABELS as readonly string[]).includes(value)

export async function labelMessage(text: string, client: OpenAI = new OpenAI()): Promise<Label> {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: LABEL_PROMPT },
      { role: 'user', content: text }
    ]
  })
  const reply = (res.choices[0].message.content ?? '').trim().toLowerCase()
  if (!isLabel(reply)) throw new Error(`Expected one label, got: ${reply}`)
  return reply
}

export function buildTriageMessages(text: string): Message[] {
  const examples = EXAMPLES.flatMap(([question, answer]): Message[] => [
    { role: 'user', content: question },
    { role: 'assistant', content: answer }
  ])
  return [{ role: 'system', content: TRIAGE_PROMPT }, ...examples, { role: 'user', content: text }]
}

export async function triage(text: string, client: OpenAI = new OpenAI()): Promise<Triage> {
  const res = await client.chat.completions.create({ model: MODEL, messages: buildTriageMessages(text) })
  const reply = (res.choices[0].message.content ?? '').trim()
  const match = reply.match(TRIAGE_LINE)
  if (!match) throw new Error(`Expected a triage line, got: ${reply}`)
  return { label: match[1] as Label, plant: match[2], urgency: match[3] as Urgency }
}
