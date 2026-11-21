import { careReply } from '../../model.mjs'
import { countTokens, truncateTokens } from '../../../../kit/tokens.mjs'

const MODEL = 'llmapps-care-1'
const SYSTEM_PROMPT =
  'You are Moss, the plant care assistant for Fernhollow. Answer in one or two friendly sentences.'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const quiet = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const expected = (question) =>
  careReply([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question }
  ])

export const checks = {
  async messages(t) {
    const question = 'My fern has crispy brown tips. What am I doing wrong?'
    const r = await t.call(t.workspace, 'src/ask.ts', 'buildMessages', [question])
    const m = r.value ?? []
    return quiet([
      {
        name: 'Returns two messages',
        passed: r.ok && Array.isArray(m) && m.length === 2,
        message: r.ok
          ? 'buildMessages should return an array with exactly two messages.'
          : 'buildMessages threw. Read the error.',
        output: show(r)
      },
      {
        name: 'The system message comes first',
        passed: r.ok && m[0]?.role === 'system' && m[0]?.content === SYSTEM_PROMPT,
        message: 'The first message should have the system role and SYSTEM_PROMPT as its content.',
        output: show(r)
      },
      {
        name: 'The question is the user message',
        passed: r.ok && m[1]?.role === 'user' && m[1]?.content === question,
        message: 'The second message should have the user role and the question, unchanged, as its content.',
        output: show(r)
      }
    ])
  },

  async ask(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const known = 'How much light does a snake plant need?'
    const unknown = 'Is my baobab tree happy indoors?'
    const [a, b, fake, types] = await Promise.all([
      t.call(dir, 'src/ask.ts', 'ask', [known]),
      t.call(dir, 'src/ask.ts', 'ask', [unknown]),
      t.call(dir, '.grader/drive.mjs', 'withFakeClient', ['ask', ['Hello']]),
      t.typecheck(dir, ['src/ask.ts'])
    ])
    const sent = fake.value?.requests?.[0]
    return quiet([
      {
        name: 'Answers a care question',
        passed: a.ok && a.value === expected(known),
        message: a.ok
          ? 'ask should return the text of the reply. If it does not start with "Moss here.", the model did not see the system message.'
          : 'ask threw. Read the error.',
        output: show(a)
      },
      {
        name: 'Answers a question about a plant the model does not know',
        passed: b.ok && b.value === expected(unknown),
        message: 'ask should return the reply text unchanged for any question.',
        output: show(b)
      },
      {
        name: 'Uses the client it is given',
        passed: fake.ok && fake.value?.result === 'Fake reply.' && fake.value.requests.length === 1,
        message:
          'Called with a fake client, ask should send exactly one request through that client and return its reply text.',
        output: show(fake)
      },
      {
        name: 'Sends MODEL and the messages from buildMessages',
        passed: sent?.model === MODEL && sent?.messages?.[1]?.content === 'Hello',
        message: 'The request should name MODEL and carry the messages buildMessages returns.',
        output: show(fake)
      },
      {
        name: 'ask.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/ask.ts.',
        output: types.output
      }
    ])
  },

  async details(t) {
    const question = 'Why are the leaves on my pothos turning pale?'
    const full = expected(question)
    const promptTokens = countTokens(SYSTEM_PROMPT) + countTokens(question)
    const [roomy, tight, fake] = await Promise.all([
      t.call(t.workspace, 'src/ask.ts', 'askWithDetails', [question, 200]),
      t.call(t.workspace, 'src/ask.ts', 'askWithDetails', [question, 6]),
      t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') }).then((dir) =>
        t.call(dir, '.grader/drive.mjs', 'withFakeClient', ['askWithDetails', ['Hello', 30]])
      )
    ])
    const r = roomy.value ?? {}
    const c = tight.value ?? {}
    return quiet([
      {
        name: 'Returns the full text and a normal finish',
        passed: roomy.ok && r.text === full && r.finishReason === 'stop',
        message: roomy.ok
          ? 'With 200 tokens the reply fits. text should be the reply content and finishReason the finish_reason of the choice.'
          : 'askWithDetails threw. Read the error.',
        output: show(roomy)
      },
      {
        name: 'Reports the token counts from usage',
        passed:
          roomy.ok &&
          r.promptTokens === promptTokens &&
          r.completionTokens === countTokens(full) &&
          r.totalTokens === promptTokens + countTokens(full),
        message: 'promptTokens, completionTokens and totalTokens should be copied from the usage object of the response.',
        output: show(roomy)
      },
      {
        name: 'A tight budget shows the reply was cut',
        passed:
          tight.ok && c.finishReason === 'length' && c.text === truncateTokens(full, 6) && c.completionTokens === 6,
        message:
          'With maxTokens 6 the model must stop early. Make sure maxTokens is sent as max_tokens and that you return the finish reason the model sent.',
        output: show(tight)
      },
      {
        name: 'Uses the client it is given',
        passed:
          fake.ok &&
          (fake.value?.requests?.[0]?.max_tokens ?? fake.value?.requests?.[0]?.max_completion_tokens) === 30 &&
          fake.value?.result?.totalTokens === 13,
        message: 'Called with a fake client, askWithDetails should send its request through that client with max_tokens set.',
        output: show(fake)
      }
    ])
  }
}
