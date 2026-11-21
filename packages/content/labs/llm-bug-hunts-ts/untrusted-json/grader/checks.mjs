import { messages } from '../starter/src/messages.ts'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)

const parsesTo = (r, action, trackingId) =>
  r.ok && r.value?.ok === true && r.value.request?.action === action && r.value.request?.trackingId === trackingId

const rejected = (r) => r.ok && r.value?.ok === false && typeof r.value.reason === 'string'

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/parse.ts': t.chapterPath('starter/src/parse.ts') })
    const r = await t.call(dir, 'src/reproduce.ts', 'reproduceCrash')
    if (!r.ok || typeof r.value?.message !== 'string' || typeof r.value?.error !== 'string') {
      return [
        {
          name: 'reproduceCrash returns { message, error }',
          passed: false,
          message: r.ok
            ? 'reproduceCrash should return an object with a string message and a string error.'
            : 'reproduceCrash threw instead of returning. Make sure you catch the error from parseRequest.',
          output: show(r)
        }
      ]
    }
    const again = await t.call(dir, 'src/parse.ts', 'parseRequest', [r.value.message])
    return [
      {
        name: 'The message crashes the original parseRequest',
        passed: !again.ok,
        message: again.ok
          ? 'The original parseRequest handled your message without throwing. Run the demo and pick one that crashes it.'
          : undefined,
        output: `parseRequest(${JSON.stringify(r.value.message)}) -> ${show(again)}`
      },
      {
        name: 'error is the message of that crash',
        passed: !again.ok && r.value.error.length > 0 && again.error.includes(r.value.error),
        message:
          'error should be the message of the error parseRequest threw for that customer message.',
        output: show(r)
      }
    ].map((d) => (d.passed ? { ...d, message: undefined } : d))
  },

  async fix(t) {
    const dir = await t.sandbox()
    const call = (message) => t.call(dir, 'src/parse.ts', 'parseRequest', [message])
    const names = Object.keys(messages)
    const runs = await Promise.all(names.map((name) => call(messages[name])))
    const r = Object.fromEntries(names.map((name, i) => [name, runs[i]]))
    const types = await t.typecheck(dir, ['src/parse.ts'])
    const out = (name) => `parseRequest(${JSON.stringify(messages[name])}) -> ${show(r[name])}`
    return [
      {
        name: 'Plain JSON still parses',
        passed: parsesTo(r.clean, 'reschedule', 'KP-20481'),
        message: 'A clean JSON reply should give { ok: true, request } with the action and tracking id.',
        output: out('clean')
      },
      {
        name: 'JSON inside a code fence parses',
        passed: parsesTo(r.fenced, 'reschedule', 'KP-55102'),
        message: 'The model sometimes wraps its JSON in a markdown code fence. Look at the raw reply text.',
        output: out('fenced')
      },
      {
        name: 'JSON after chatty text parses',
        passed: parsesTo(r.chatty, 'cancel', 'KP-77310') && parsesTo(r.redirect, 'redirect', 'KP-41876'),
        message: 'The model sometimes puts a sentence before its JSON. Look at the raw reply text.',
        output: `${out('chatty')}\n${out('redirect')}`
      },
      {
        name: 'A reply without JSON is ok: false',
        passed: rejected(r.noRequest),
        message: 'When the reply has no JSON at all, parseRequest should resolve to { ok: false, reason } and never throw.',
        output: out('noRequest')
      },
      {
        name: 'A missing tracking id is ok: false',
        passed: rejected(r.missingId),
        message: 'The JSON parsed, but its trackingId is not a tracking id. Check the shape before trusting it.',
        output: out('missingId')
      },
      {
        name: 'An unsupported action is ok: false',
        passed: rejected(r.unknownAction),
        message: 'The JSON parsed, but its action is not one Kes supports. Check the shape before trusting it.',
        output: out('unknownAction')
      },
      {
        name: 'parse.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/parse.ts.',
        output: types.output
      }
    ].map((d) => (d.passed ? { ...d, message: undefined } : d))
  },

  test(t) {
    return t.judgeTest({
      test: 'src/parse.test.ts',
      target: 'src/parse.ts',
      wrong: 'grader/variants/no-validation.ts',
      wrongLabel: 'a fix that parses safely but never checks the shape'
    })
  }
}
