// Local model behavior for the Saltmarsh Paddle Co. help desk. Replies depend only on the request.
import { bagOfWords } from '../../kit/embed.mjs'

export const EMBED_DIMS = 1024

export const NO_SOURCES = 'I cannot answer without sources. Send the passages to answer from.'
export const DONT_KNOW = 'I do not know. The sources do not say.'

const STOP = new Set(
  (
    'a an and are as at be by for from has have in is it its of on or that the to was with ' +
    'i me my we our you your can could do does did how what when where which who why will would ' +
    'should may must there this these those if any about get much many some'
  ).split(' ')
)

const stem = (word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word)

const words = (text) =>
  (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w)).map(stem)

const textOf = (message) => (typeof message?.content === 'string' ? message.content : '')

function findQuestion(messages) {
  const users = messages.filter((m) => m.role === 'user').map(textOf)
  for (const text of [...users].reverse()) {
    const asked = text.match(/^Question:\s*(.+)$/im)?.[1]
    if (asked) return asked
  }
  return users.at(-1) ?? ''
}

/** Answers with the source sentences that share the most words with the question, citing [n]. */
export function groundedAnswer(request) {
  const messages = request.messages ?? []
  const sources = messages
    .flatMap((m) => [...textOf(m).matchAll(/^\[(\d+)\][ \t]*(.+)$/gm)])
    .map((m) => ({ n: Number(m[1]), text: m[2] }))
  if (sources.length === 0) return NO_SOURCES
  const asked = new Set(words(findQuestion(messages)))
  const needed = Math.min(2, asked.size)
  const ranked = sources
    .flatMap((s) =>
      s.text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => ({ n: s.n, sentence, score: new Set(words(sentence).filter((w) => asked.has(w))).size }))
    )
    .filter((s) => needed > 0 && s.score >= needed)
    .sort((a, b) => b.score - a.score || a.n - b.n)
  if (ranked.length === 0) return DONT_KNOW
  const [best] = ranked
  const second = ranked.find((s) => s.n !== best.n && s.score >= best.score - 1)
  return [best, second]
    .filter(Boolean)
    .map((s) => `${s.sentence.replace(/[.!?]$/, '')} [${s.n}].`)
    .join(' ')
}

export const embed = (text) => bagOfWords(text, EMBED_DIMS)

export const models = {
  'rag-chat-1': groundedAnswer
}

export const embeddings = {
  'rag-embed-1': embed
}
