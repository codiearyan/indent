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

export const LABEL_PROMPT = ''

export const TRIAGE_PROMPT = ''

export async function labelMessage(text: string, client: OpenAI = new OpenAI()): Promise<Label> {
  throw new Error('Not implemented')
}

export function buildTriageMessages(text: string): Message[] {
  throw new Error('Not implemented')
}

export async function triage(text: string, client: OpenAI = new OpenAI()): Promise<Triage> {
  throw new Error('Not implemented')
}
