import { isDeepStrictEqual } from 'node:util'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const detail = (name, passed, message, output) => ({ name, passed, message: passed ? undefined : message, output })

function notImplemented(fn, r) {
  const error = r.ok ? r.value?.error : r.error
  if (!/Not implemented/.test(error ?? '')) return null
  return [detail(`${fn} is implemented`, false, `${fn} still throws 'Not implemented'. Replace that line with your code.`, error)]
}

async function sandbox(t) {
  return t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
}

const contents = (r) =>
  (r.value?.result ?? []).map((m) => {
    try {
      return [m.tool_call_id, JSON.parse(m.content)]
    } catch {
      return [m.tool_call_id, m.content]
    }
  })

export const checks = {
  async concurrent(t) {
    const dir = await sandbox(t)
    const run = (plan) => t.call(dir, '.grader/drive.mjs', 'run', [plan])
    const [three, five] = await Promise.all([
      run([['c-1', 'oat', 60], ['c-2', 'rye', 10], ['c-3', 'egg', 30]]),
      run([['d-1', 'a', 40], ['d-2', 'b', 40], ['d-3', 'c', 40], ['d-4', 'd', 40], ['d-5', 'e', 40]])
    ])
    const early = notImplemented('runToolCalls', three)
    if (early) return early
    const ran = (r, n) => r.ok && !r.value.error && Array.isArray(r.value.result) && r.value.result.length === n
    return [
      detail(
        'Returns one tool message per call',
        ran(three, 3) && ran(five, 5) && [...three.value.result, ...five.value.result].every((m) => m.role === 'tool' && typeof m.content === 'string'),
        "Return an array with one { role: 'tool', tool_call_id, content } message per call. Use executeToolCall for the content.",
        show(three)
      ),
      detail(
        'Starts all three calls before any finishes',
        ran(three, 3) && three.value.maxInFlight === 3,
        `At most ${three.value?.maxInFlight} call(s) were running at once. Start every call first, then wait for all of them together.`,
        show(three)
      ),
      detail(
        'Starts all five calls before any finishes',
        ran(five, 5) && five.value.maxInFlight === 5,
        `At most ${five.value?.maxInFlight} call(s) were running at once. Waiting inside a loop runs the calls one by one.`,
        show(five)
      )
    ]
  },

  async 'in-order'(t) {
    const dir = await sandbox(t)
    const run = (plan) => t.call(dir, '.grader/drive.mjs', 'run', [plan])
    const [reversed, same, unknown, none] = await Promise.all([
      run([['r-1', 'slow', 60], ['r-2', 'fast', 10], ['r-3', 'medium', 30]]),
      run([['s-1', 'left', 30], ['s-2', 'right', 5]]),
      run([['u-1', 'before', 30], ['u-2', 'ghost', 5, 'teleport'], ['u-3', 'after', 10]]),
      run([])
    ])
    const early = notImplemented('runToolCalls', reversed)
    if (early) return early
    const unknownContents = contents(unknown)
    return [
      detail(
        'Answers in call order, even when calls finish out of order',
        reversed.ok && isDeepStrictEqual(contents(reversed), [['r-1', { label: 'slow' }], ['r-2', { label: 'fast' }], ['r-3', { label: 'medium' }]]),
        `The calls finished in the order ${JSON.stringify(reversed.value?.finished)}. The messages should still follow the order of the calls, each with its own id and result.`,
        show(reversed)
      ),
      detail(
        'Matches each result to its own id',
        same.ok && isDeepStrictEqual(contents(same), [['s-1', { label: 'left' }], ['s-2', { label: 'right' }]]),
        'Two calls to the same tool finished in reverse order. Keep them in call order, each tool_call_id next to the result of its own call.',
        show(same)
      ),
      detail(
        'A failing call is answered in its own place',
        unknown.ok &&
          isDeepStrictEqual(unknownContents.map(([id]) => id), ['u-1', 'u-2', 'u-3']) &&
          typeof unknownContents[1]?.[1]?.error === 'string' &&
          isDeepStrictEqual(unknownContents[0][1], { label: 'before' }) &&
          isDeepStrictEqual(unknownContents[2][1], { label: 'after' }),
        'A call to an unknown tool should get an error result in its own slot, and the calls around it should still get theirs.',
        show(unknown)
      ),
      detail(
        'No calls means no messages',
        none.ok && isDeepStrictEqual(none.value?.result, []),
        'With an empty list of calls, return an empty array.',
        show(none)
      )
    ]
  },

  async agent(t) {
    const dir = await sandbox(t)
    const ask = (q) => t.call(dir, 'src/agent.ts', 'runAgent', [q])
    const [three, two, fake, types] = await Promise.all([
      ask('Check stock for oat milk, rye bread and eggs.'),
      ask('Check stock for eggs and honey.'),
      t.call(dir, '.grader/drive.mjs', 'agent'),
      t.typecheck(dir, ['src/agent.ts', 'src/parallel.ts'])
    ])
    const early = notImplemented('runToolCalls', fake)
    if (early) return early
    const f = fake.value ?? {}
    const answerHint = 'Pip asks for every stock check in one reply. Answer all of them, each under its own id, before the next request.'
    return [
      detail(
        'Answers a three-product stock check',
        three.ok && isDeepStrictEqual(three.value, { answer: 'Oat milk 1 L: 14 in stock. Rye loaf 800 g: out of stock. Eggs (box of 12): 6 in stock.', steps: 2 }),
        answerHint,
        show(three)
      ),
      detail(
        'Answers a two-product stock check',
        two.ok && isDeepStrictEqual(two.value, { answer: 'Eggs (box of 12): 6 in stock. Wildflower honey 250 g: 12 in stock.', steps: 2 }),
        answerHint,
        show(two)
      ),
      detail(
        'Runs the calls of one reply at the same time',
        fake.ok && f.maxInFlight === 3,
        `With three slow calls in one reply, at most ${f.maxInFlight} ran at once. Use runToolCalls in the loop instead of awaiting each call in turn.`,
        show(fake)
      ),
      detail(
        'Sends one assistant message, then its tool messages in call order',
        fake.ok &&
          isDeepStrictEqual(f.secondRequest, [
            { role: 'assistant', tool_calls: ['p-1', 'p-2', 'p-3'] },
            { role: 'tool', tool_call_id: 'p-1', content: '{"label":"first"}' },
            { role: 'tool', tool_call_id: 'p-2', content: '{"label":"second"}' },
            { role: 'tool', tool_call_id: 'p-3', content: '{"label":"third"}' }
          ]),
        'After the user message, the next request should hold the assistant message with all three calls, then exactly one tool message per call, in call order.',
        show(fake)
      ),
      detail('agent.ts and parallel.ts type-check', types.passed, 'TypeScript reports errors in src/agent.ts or src/parallel.ts.', types.output)
    ]
  }
}
