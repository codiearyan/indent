import { countTokens } from '../../../../kit/tokens.mjs'

const SYSTEM_PROMPT =
  'You are Moss, the plant care assistant for Fernhollow. Answer kindly and remember what the customer said earlier.'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const quiet = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const tokens = (messages) => messages.reduce((sum, m) => sum + countTokens(m.content), 0)

function reference(messages, budget) {
  const [system, ...rest] = messages
  while (tokens([system, ...rest]) > budget) rest.shift()
  if (rest[0]?.role === 'assistant') rest.shift()
  return [system, ...rest]
}

const words = (tag, n) => [tag, ...Array(n - 1).fill('leaf')].join(' ')
const SYSTEM = { role: 'system', content: 'You are Moss.' }
const HISTORY = [
  SYSTEM,
  ...[1, 2, 3].flatMap((i) => [
    { role: 'user', content: words(`question${i}`, 10) },
    { role: 'assistant', content: words(`answer${i}`, 20) }
  ]),
  { role: 'user', content: words('question4', 10) }
]

// The history after each send is the request it made plus the reply.
function chainBreaks(r, budget) {
  const { requests = [], replies = [] } = r.value ?? {}
  return requests.findIndex((request, i) => {
    if (i === 0) return false
    const before = [...requests[i - 1], { role: 'assistant', content: replies[i - 1] }]
    return !same(request, reference([...before, request.at(-1)], budget))
  })
}

export const checks = {
  async history(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [r, types] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'converse', [3]),
      t.typecheck(dir, ['src/conversation.ts'])
    ])
    const v = r.value ?? {}
    const history = v.history ?? []
    return quiet([
      {
        name: 'Holds a three-question conversation',
        passed: r.ok && !v.error && v.replies?.length === 3,
        message: 'send should return the reply text for every question. Read the error.',
        output: show(r)
      },
      {
        name: 'The model sees every earlier question',
        passed: /\(I can see 3 of your messages\.\)$/.test(v.replies?.[2] ?? '') && /^Moss here\./.test(v.replies?.[2] ?? ''),
        message:
          'The local model says how many of your messages it can see. On the third question it should see all three, and the system prompt.',
        output: show(r)
      },
      {
        name: 'History holds every message in order',
        passed:
          history.length === 7 &&
          history[0]?.role === 'system' &&
          history.slice(1).every((m, i) => m.role === (i % 2 === 0 ? 'user' : 'assistant')) &&
          history.at(-1)?.content === v.replies?.[2],
        message:
          'After three sends, history should be the system message followed by user, assistant, user, assistant, user, assistant, ending with the last reply.',
        output: JSON.stringify(history, null, 2)
      },
      {
        name: 'conversation.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/conversation.ts.',
        output: types.output
      }
    ])
  },

  async fit(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const fit = (budget) => t.call(dir, '.grader/drive.mjs', 'fit', [HISTORY, budget])
    const [roomy, tight, onReply, bare, impossible] = await Promise.all([fit(200), fit(75), fit(64), fit(14), fit(13)])
    const result = (r) => r.value?.result
    const roles = (r) => (result(r) ?? []).map((m) => `${m.role}: ${m.content.split(' ')[0]}`)
    const outputOf = (r, budget) =>
      `budget ${budget}, input ${tokens(HISTORY)} tokens\n${r.ok ? JSON.stringify({ ...r.value, result: roles(r) }, null, 2) : r.error}`
    return quiet([
      {
        name: 'A history that fits is returned whole',
        passed: roomy.ok && same(result(roomy), HISTORY),
        message: 'When the messages already fit the budget, fitToBudget should return all of them.',
        output: outputOf(roomy, 200)
      },
      {
        name: 'Drops only the oldest messages it has to',
        passed: same(result(tight), reference(HISTORY, 75)),
        message:
          'Over budget, fitToBudget should keep the system message and drop the oldest messages after it, one at a time, stopping as soon as the total fits.',
        output: outputOf(tight, 75)
      },
      {
        name: 'Never starts the kept history with a reply',
        passed: same(result(onReply), reference(HISTORY, 64)),
        message:
          'If the first message after the system message would be an assistant reply, drop it too, so the history starts with a question.',
        output: outputOf(onReply, 64)
      },
      {
        name: 'Keeps the system message and the last message',
        passed: same(result(bare), [SYSTEM, HISTORY.at(-1)]),
        message: 'With a budget that only fits the system message and the latest question, return exactly those two.',
        output: outputOf(bare, 14)
      },
      {
        name: 'A budget that cannot be met is an error',
        passed: impossible.ok && /budget/i.test(impossible.value?.error ?? ''),
        message:
          'When even the system message and the last message are over budget, fitToBudget should throw an error that mentions "budget".',
        output: outputOf(impossible, 13)
      },
      {
        name: 'Does not change its input',
        passed: [roomy, tight, onReply, bare].every((x) => x.ok && x.value?.inputChanged === false),
        message: 'fitToBudget should return a new array and leave the messages it was given as they were.',
        output: [roomy, tight, onReply, bare].map((x) => `inputChanged: ${x.value?.inputChanged}`).join('\n')
      }
    ])
  },

  async budget(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [long, small] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'converse', [30]),
      t.call(dir, '.grader/drive.mjs', 'converse', [12, 150])
    ])
    const l = long.value ?? {}
    const sizes = (r) => (r.value?.requests ?? []).map(tokens)
    const history = l.history ?? []
    const breaks = chainBreaks(long, 300)
    const summary = (r) =>
      r.ok
        ? JSON.stringify(
            { error: r.value?.error, failedAt: r.value?.failedAt, requestTokens: sizes(r), lastReply: r.value?.replies?.at(-1) },
            null,
            2
          )
        : r.error
    return quiet([
      {
        name: 'A 30-question conversation keeps working',
        passed: long.ok && !l.error && l.replies?.length === 30,
        message:
          'send failed partway through a long conversation. Read the error and look at how many tokens each request carries.',
        output: summary(long)
      },
      {
        name: 'Every request stays under the budget',
        passed: sizes(long).length === 30 && sizes(long).every((n) => n <= 300) && sizes(small).length === 12 && sizes(small).every((n) => n <= 150),
        message:
          'Each request should carry at most this.budget tokens: 300 by default, 150 when the conversation is created with a budget of 150. Trim before every request.',
        output: `default budget:\n${summary(long)}\nbudget 150:\n${summary(small)}`
      },
      {
        name: 'The system message always survives',
        passed:
          (l.requests ?? []).every((m) => m[0]?.role === 'system' && m[0]?.content === SYSTEM_PROMPT && m[1]?.role === 'user') &&
          /^Moss here\./.test(l.replies?.at(-1) ?? ''),
        message:
          'Every request should start with the system prompt, followed by a question. If late replies stop starting with "Moss here.", the system message was dropped.',
        output: summary(long)
      },
      {
        name: 'Keeps as much recent history as fits',
        passed: long.ok && !l.error && breaks === -1,
        message: breaks === -1
          ? 'The conversation did not finish, so its requests could not be compared. Fix the first check of this task first.'
          : `Request ${breaks + 1} was not the previous history plus the new question, trimmed with fitToBudget. Trim the messages you are about to send, then keep them as the new history.`,
        output: summary(long)
      },
      {
        name: 'History ends with the latest question and reply',
        passed:
          history[0]?.content === SYSTEM_PROMPT &&
          history.at(-2)?.content === 'Question 30: how should I look after my monstera this week?' &&
          history.at(-1)?.content === l.replies?.at(-1),
        message: 'After send returns, history should start with the system message and end with the question and its reply.',
        output: JSON.stringify(history, null, 2)
      }
    ])
  }
}
