// Streaming Moss's answers into the shop's chat window. All three tasks live in this file.
//
// 1. collectStream(chunks): read every chunk, join the text from each delta and return it with the
//    finish reason. Skip chunks that carry no text or no choices. If no chunk ever carries a finish
//    reason, the stream was cut: throw an Error containing "ended early".
// 2. collectStream(chunks, onPartial): also call onPartial with all the text so far, once after
//    every chunk that adds text.
// 3. streamAnswer(question, onPartial, maxTokens, client): request a streamed answer from MODEL
//    (stream: true, max_tokens: maxTokens, messages: buildMessages(question)) and collect it.
// `node src/demo.ts` prints an answer as it arrives.
import OpenAI from 'openai'

export const MODEL = 'llmapps-care-1'
export const SYSTEM_PROMPT =
  'You are Moss, the plant care assistant for Fernhollow. Answer in one or two friendly sentences.'

export type Chunk = OpenAI.Chat.ChatCompletionChunk
export type Message = OpenAI.Chat.ChatCompletionMessageParam

export interface StreamResult {
  text: string
  finishReason: string
}

export function buildMessages(question: string): Message[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question }
  ]
}

export async function collectStream(
  chunks: AsyncIterable<Chunk>,
  onPartial: (textSoFar: string) => void = () => {}
): Promise<StreamResult> {
  let text = ''
  let finishReason: string | null = null
  for await (const chunk of chunks) {
    const choice = chunk.choices[0]
    if (!choice) continue
    const piece = choice.delta?.content
    if (piece) {
      text += piece
      onPartial(text)
    }
    if (choice.finish_reason) finishReason = choice.finish_reason
  }
  if (!finishReason) throw new Error('The stream ended early, without a finish reason.')
  return { text, finishReason }
}

export async function streamAnswer(
  question: string,
  onPartial: (textSoFar: string) => void,
  maxTokens = 200,
  client: OpenAI = new OpenAI()
): Promise<StreamResult> {
  const stream = await client.chat.completions.create({
    model: MODEL,
    stream: true,
    max_tokens: maxTokens,
    messages: buildMessages(question)
  })
  return collectStream(stream, onPartial)
}
