import { isDeepStrictEqual } from 'node:util'
import { DONT_KNOW, embed as reference, groundedAnswer } from '../../model.mjs'
import { chunkDocs } from '../starter/src/chunk.ts'
import { handbook } from '../starter/src/handbook.ts'

const TOP_K = 3
const MIN_SCORE = 0.2
const chunks = chunkDocs(handbook, 200, 40)
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0)

function hitsFor(question) {
  const q = reference(question)
  return chunks
    .map((chunk) => ({ chunk, score: dot(q, reference(chunk.text)) }))
    .filter((hit) => hit.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
}

const sourceLines = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .flatMap((m) => [...String(m?.content ?? '').matchAll(/^\[(\d+)\][ \t]*(.+)$/gm)])
    .map((m) => ({ n: Number(m[1]), text: m[2].trim() }))

const expectedReply = (question) =>
  groundedAnswer({
    messages: [
      { role: 'user', content: `${hitsFor(question).map((h, i) => `[${i + 1}] ${h.chunk.text}`).join('\n')}\nQuestion: ${question}` }
    ]
  })

const show = (r) => (r.ok ? JSON.stringify({ ...r.value, chats: `${r.value.chats.length} chat request(s)` }, null, 2) : r.error)
const notImplemented = (r) => !r.ok && /Not implemented/.test(r.error)
const unwritten = (fn, r) => [
  {
    name: `${fn} is implemented`,
    passed: false,
    message: `${fn} still throws 'Not implemented'. Replace that line with your code.`,
    output: r.error
  }
]
const tidy = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

async function driver(t) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  return { dir, ask: (question, reply = null) => t.call(dir, '.grader/drive.mjs', 'ask', [question, reply]) }
}

const DOGS = 'Are dogs welcome in kayaks or canoes?'
const VOUCHERS = 'Can gift vouchers pay for a guided sunset tour?'
const DEPOSIT = 'What deposit does a boat need when I book?'
const CAFE = 'What time does the cafe open on the quay?'
const SURF = 'Do you sell surfboards?'
const CARDS = 'Which credit cards are accepted online?'

export const checks = {
  async prompt(t) {
    const hits = hitsFor(VOUCHERS).concat({ chunk: chunks.find((c) => c.id === 'parking#0'), score: 0.1 })
    const [r, empty] = await Promise.all([
      t.call(t.workspace, 'src/answer.ts', 'buildPrompt', [VOUCHERS, hits]),
      t.call(t.workspace, 'src/answer.ts', 'buildPrompt', [SURF, []])
    ])
    if (notImplemented(r)) return unwritten('buildPrompt', r)
    const messages = r.ok && Array.isArray(r.value) ? r.value : []
    const shown = r.ok ? messages.map((m) => `--- ${m?.role}\n${m?.content}`).join('\n') : r.error
    const system = messages.find((m) => m?.role === 'system')
    const lastUser = [...messages].reverse().find((m) => m?.role === 'user')
    const wanted = hits.map((hit, i) => ({ n: i + 1, text: hit.chunk.text }))
    const reply = groundedAnswer({ messages })
    return tidy([
      {
        name: 'A system message sets the rules',
        passed: typeof system?.content === 'string' && /\bonly\b/i.test(system.content) && /\bcite/i.test(system.content),
        message: r.ok
          ? 'Add a system message that tells the model to answer only from the sources and to cite them as [n]. Use the words "only" and "cite".'
          : 'buildPrompt threw an error. Read it below.',
        output: shown
      },
      {
        name: 'Numbers every source in hit order',
        passed: isDeepStrictEqual(sourceLines(messages), wanted),
        message: `Put each hit's chunk text on its own line starting with [1], [2], ... in the order of hits, and nothing else numbered that way. Expected ${hits.length} source lines.`,
        output: `source lines found:\n${JSON.stringify(sourceLines(messages), null, 2)}\n\n${shown}`
      },
      {
        name: 'Ends with the question',
        passed: typeof lastUser?.content === 'string' && lastUser.content.trim().split('\n').at(-1) === `Question: ${VOUCHERS}`,
        message: "The last user message should end with a line 'Question: ' followed by the question exactly as asked.",
        output: shown
      },
      {
        name: 'The model can answer from it',
        passed: reply !== DONT_KNOW && /\[\d+\]/.test(reply) && reply === expectedReply(VOUCHERS),
        message: 'The lab model read this prompt and could not answer with citations. Check the source lines and the Question line.',
        output: `the lab model replied: ${reply}`
      },
      {
        name: 'Works with no hits',
        passed: empty.ok && Array.isArray(empty.value) && sourceLines(empty.value).length === 0,
        message: 'buildPrompt(question, []) should still return messages, with no numbered sources.',
        output: empty.ok ? JSON.stringify(empty.value, null, 2) : empty.error
      }
    ])
  },

  async answer(t) {
    const { ask } = await driver(t)
    const [dogs, vouchers, deposit, fake, cafe] = await Promise.all([
      ask(DOGS),
      ask(VOUCHERS),
      ask(DEPOSIT),
      ask(VOUCHERS, 'Yes [2]. See [1], also [2] and [7].'),
      ask(CAFE)
    ])
    if (notImplemented(dogs)) return unwritten('answer', dogs)
    const sent = (r) => (r.ok && r.value.chats[0] ? sourceLines(r.value.chats[0].messages).map((s) => s.text) : [])
    const ids = (question) => hitsFor(question).map((h) => h.chunk.id)
    return tidy([
      {
        name: "Returns the model's reply",
        passed: dogs.ok && dogs.value.answer === expectedReply(DOGS) && dogs.value.chats[0]?.model === 'rag-chat-1',
        message: dogs.ok
          ? 'answer should send buildPrompt(question, hits) to CHAT_MODEL and return the reply text, unchanged, as answer.'
          : 'answer threw an error. Read it below.',
        output: show(dogs)
      },
      {
        name: 'Searches with TOP_K and MIN_SCORE',
        passed: isDeepStrictEqual(sent(deposit), hitsFor(DEPOSIT).map((h) => h.chunk.text)) && isDeepStrictEqual(sent(dogs), hitsFor(DOGS).map((h) => h.chunk.text)),
        message: `The prompt should hold the hits from search(index, question, TOP_K, MIN_SCORE). For the deposit question that is ${ids(DEPOSIT).length} chunk(s): ${ids(DEPOSIT).join(', ')}.`,
        output: `sources sent for the deposit question:\n${sent(deposit).join('\n') || '(none)'}`
      },
      {
        name: 'Returns the chunks the reply cites',
        passed: vouchers.ok && isDeepStrictEqual(vouchers.value.sources, ['vouchers#0', 'groups#0']),
        message: 'sources should hold the chunk for each [n] in the reply: [1] is the first hit, [2] the second.',
        output: show(vouchers)
      },
      {
        name: 'Each cited chunk once, in order, unknown numbers ignored',
        passed: fake.ok && isDeepStrictEqual(fake.value.sources, ['groups#0', 'vouchers#0']),
        message: "With a reply of 'Yes [2]. See [1], also [2] and [7].' and two hits, sources should list hit 2 then hit 1, once each, and skip [7].",
        output: show(fake)
      },
      {
        name: 'A reply without citations has no sources',
        passed: cafe.ok && cafe.value.answer === DONT_KNOW && isDeepStrictEqual(cafe.value.sources, []),
        message: 'When the model says it does not know, return its reply with sources: [].',
        output: show(cafe)
      }
    ])
  },

  async 'not-found'(t) {
    const { dir, ask } = await driver(t)
    const [surf, cards, dogs, types] = await Promise.all([
      ask(SURF),
      ask(CARDS),
      ask(DOGS),
      t.typecheck(dir, ['src/answer.ts'])
    ])
    if (notImplemented(surf)) return unwritten('answer', surf)
    const honest = (r) =>
      r.ok && r.value.answer === r.value.notFound && isDeepStrictEqual(r.value.sources, []) && r.value.chats.length === 0
    return tidy([
      {
        name: 'An unrelated question gets NOT_FOUND',
        passed: honest(surf),
        message: surf.ok
          ? 'When search returns no hits, return { answer: NOT_FOUND, sources: [] } and do not call the chat model at all.'
          : 'answer threw an error. Read it below.',
        output: show(surf)
      },
      {
        name: 'Weak matches below MIN_SCORE count as nothing',
        passed: honest(cards),
        message: 'Every chunk scores below MIN_SCORE for this question, but above 0. Search with MIN_SCORE so they are dropped.',
        output: show(cards)
      },
      {
        name: 'A covered question still asks the model once',
        passed: dogs.ok && dogs.value.chats.length === 1 && dogs.value.answer === expectedReply(DOGS),
        message: 'A question the handbook covers should still get one chat request and the model\'s answer.',
        output: show(dogs)
      },
      {
        name: 'answer.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/answer.ts.',
        output: types.output
      }
    ])
  }
}
