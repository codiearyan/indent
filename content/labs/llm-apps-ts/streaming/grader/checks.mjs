import { careReply } from '../../model.mjs'
import { truncateTokens } from '../../../../kit/tokens.mjs'

const SYSTEM_PROMPT =
  'You are Moss, the plant care assistant for Fernhollow. Answer in one or two friendly sentences.'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const quiet = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const chunk = (delta, finish_reason = null) => ({
  id: 'chatcmpl-grader',
  object: 'chat.completion.chunk',
  created: 1700000000,
  model: 'llmapps-care-1',
  choices: [{ index: 0, delta, finish_reason }]
})
const usageChunk = {
  id: 'chatcmpl-grader',
  object: 'chat.completion.chunk',
  created: 1700000000,
  model: 'llmapps-care-1',
  choices: [],
  usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 }
}

const NORMAL = [
  chunk({ role: 'assistant', content: '' }),
  chunk({ content: 'Water ' }),
  chunk({ content: 'it ' }),
  chunk({}),
  chunk({ content: 'weekly.' }),
  chunk({}, 'stop'),
  usageChunk
]
const CUT_BY_LIMIT = [chunk({ role: 'assistant', content: '' }), chunk({ content: 'Keep the' }), chunk({ content: ' soil' }), chunk({}, 'length')]
const DROPPED = [chunk({ role: 'assistant', content: '' }), chunk({ content: 'Mist the ' }), chunk({ content: 'leaves' })]

export const checks = {
  async assemble(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const collect = (chunks) => t.call(dir, '.grader/drive.mjs', 'collect', [chunks, false])
    const [normal, cut, dropped, types] = await Promise.all([
      collect(NORMAL),
      collect(CUT_BY_LIMIT),
      collect(DROPPED),
      t.typecheck(dir, ['src/stream.ts'])
    ])
    return quiet([
      {
        name: 'Joins the text of every chunk',
        passed: normal.ok && same(normal.value?.result, { text: 'Water it weekly.', finishReason: 'stop' }),
        message: normal.value?.error
          ? 'collectStream threw on a normal stream. The last chunk of a stream may have an empty choices array.'
          : 'collectStream should return the text of all deltas joined together and the finish reason the stream sent.',
        output: show(normal)
      },
      {
        name: 'Reports a reply cut by the token limit',
        passed: cut.ok && same(cut.value?.result, { text: 'Keep the soil', finishReason: 'length' }),
        message: 'The finish reason arrives on its own chunk near the end. Keep it, whatever its value.',
        output: show(cut)
      },
      {
        name: 'A stream with no finish reason is an error',
        passed: dropped.ok && /ended early/i.test(dropped.value?.error ?? ''),
        message:
          'When the chunks run out before any finish reason arrives, the reply is incomplete. collectStream should throw an error that mentions "ended early".',
        output: show(dropped)
      },
      {
        name: 'stream.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/stream.ts.',
        output: types.output
      }
    ])
  },

  async partial(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [normal, cut] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'collect', [NORMAL, true]),
      t.call(dir, '.grader/drive.mjs', 'collect', [CUT_BY_LIMIT, true])
    ])
    return quiet([
      {
        name: 'Reports all the text so far after each piece',
        passed: normal.ok && same(normal.value?.partials, ['Water ', 'Water it ', 'Water it weekly.']),
        message:
          'onPartial should get the whole text so far, not just the new piece, once for each chunk that adds text.',
        output: show(normal)
      },
      {
        name: 'Skips chunks that add no text',
        passed: cut.ok && same(cut.value?.partials, ['Keep the', 'Keep the soil']),
        message:
          'onPartial should be called once per chunk that adds text, each time with all the text so far. The role chunk and the finish chunk add no text.',
        output: show(cut)
      },
      {
        name: 'Still returns the final result',
        passed: normal.ok && same(normal.value?.result, { text: 'Water it weekly.', finishReason: 'stop' }),
        message: 'With a callback, collectStream should still return the full text and the finish reason.',
        output: show(normal)
      }
    ])
  },

  async 'stream-answer'(t) {
    const question = 'Why is my cactus leaning towards the window?'
    const full = careReply([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ])
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [roomy, tight, fake] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'answer', [question, 200]),
      t.call(dir, '.grader/drive.mjs', 'answer', [question, 7]),
      t.call(dir, '.grader/drive.mjs', 'answerWithFakeClient', [question, NORMAL])
    ])
    const partials = roomy.value?.partials ?? []
    const growing = partials.every((p, i) => i === 0 || (p.startsWith(partials[i - 1]) && p.length > partials[i - 1].length))
    const sent = fake.value?.requests?.[0] ?? {}
    return quiet([
      {
        name: 'Streams the full answer',
        passed: roomy.ok && same(roomy.value?.result, { text: full, finishReason: 'stop' }),
        message: roomy.value?.error
          ? 'streamAnswer threw. Read the error: a stream must be read with for await, not like a normal response.'
          : 'streamAnswer should return the whole answer from the local model and its finish reason.',
        output: show(roomy)
      },
      {
        name: 'Reports text as it arrives',
        passed: partials.length > 5 && growing && partials.at(-1) === full,
        message: `onPartial was called ${partials.length} time(s). It should be called many times, with growing text, ending with the full answer.`,
        output: show(roomy)
      },
      {
        name: 'Passes on max_tokens and reports a cut answer',
        passed: tight.ok && same(tight.value?.result, { text: truncateTokens(full, 7), finishReason: 'length' }),
        message: 'With maxTokens 7 the answer should stop early and the finish reason should say so.',
        output: show(tight)
      },
      {
        name: 'Asks for a stream through the client it is given',
        passed:
          fake.ok &&
          sent.stream === true &&
          sent.model === 'llmapps-care-1' &&
          sent.messages?.[0]?.role === 'system' &&
          same(fake.value?.result, { text: 'Water it weekly.', finishReason: 'stop' }),
        message: 'streamAnswer should send one request through the client with stream: true, MODEL and buildMessages(question).',
        output: show(fake)
      }
    ])
  }
}
