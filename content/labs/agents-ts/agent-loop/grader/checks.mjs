import { isDeepStrictEqual } from 'node:util'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const detail = (name, passed, message, output) => ({ name, passed, message: passed ? undefined : message, output })

function notImplemented(fn, ...runs) {
  const r = runs.find((run) => !run.ok && /Not implemented/.test(run.error))
  const inside = runs.find((run) => run.ok && /Not implemented/.test(run.value?.error ?? ''))
  if (!r && !inside) return null
  return [detail(`${fn} is implemented`, false, `${fn} still throws 'Not implemented'. Replace that line with your code.`, r?.error ?? inside.value.error)]
}

async function sandbox(t) {
  return t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
}

const call = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } })

function parsedContents(messages) {
  return (messages ?? []).map((m) => {
    try {
      return { ...m, content: JSON.parse(m.content) }
    } catch {
      return m
    }
  })
}

export const checks = {
  async 'run-tools'(t) {
    const dir = await sandbox(t)
    const run = (calls) => t.call(dir, 'src/agent.ts', 'runToolCalls', [calls])
    const [two, unknownOrder, none] = await Promise.all([
      run([call('a-1', 'get_order', { orderId: 'PL-2043' }), call('a-2', 'check_stock', { sku: 'RYE-800' })]),
      run([call('b-1', 'get_order', { orderId: 'PL-0000' })]),
      run([])
    ])
    const early = notImplemented('runToolCalls', two)
    if (early) return early
    const expectTwo = [
      {
        role: 'tool',
        tool_call_id: 'a-1',
        content: { orderId: 'PL-2043', customer: 'Chloe Park', status: 'delivered', eta: null, total: 7.2, items: [{ sku: 'EGG-12', qty: 2 }] }
      },
      { role: 'tool', tool_call_id: 'a-2', content: { sku: 'RYE-800', name: 'Rye loaf 800 g', stock: 0 } }
    ]
    const stringContent = two.ok && Array.isArray(two.value) && two.value.every((m) => typeof m.content === 'string')
    return [
      detail(
        'One tool message per call, in order, with matching ids',
        two.ok && isDeepStrictEqual((two.value ?? []).map((m) => [m.role, m.tool_call_id]), [['tool', 'a-1'], ['tool', 'a-2']]),
        "Return an array with one { role: 'tool', tool_call_id } message for each call, in the order of the calls.",
        show(two)
      ),
      detail(
        'Each message holds its tool result as JSON text',
        stringContent && isDeepStrictEqual(parsedContents(two.value), expectTwo),
        'content should be JSON.stringify of what the matching function in toolFunctions returned for the arguments of that call.',
        show(two)
      ),
      detail(
        'Passes on an error result like any other',
        unknownOrder.ok && isDeepStrictEqual(parsedContents(unknownOrder.value), [{ role: 'tool', tool_call_id: 'b-1', content: { error: 'No order with id PL-0000' } }]),
        'getOrder returns an error object for an unknown id. That is still a result to send back.',
        show(unknownOrder)
      ),
      detail(
        'No calls means no messages',
        none.ok && isDeepStrictEqual(none.value, []),
        'With an empty list of calls, return an empty array.',
        show(none)
      )
    ]
  },

  async loop(t) {
    const dir = await sandbox(t)
    const ask = (q) => t.call(dir, 'src/agent.ts', 'runAgent', [q])
    const [short, stocked, status, fake, types] = await Promise.all([
      ask('Is everything in order PL-2041 in stock?'),
      ask('Is everything in order PL-2043 in stock?'),
      ask('Where is order PL-2042?'),
      t.call(dir, '.grader/drive.mjs', 'scripted'),
      t.typecheck(dir, ['src/agent.ts'])
    ])
    const early = notImplemented('runAgent', short, fake)
    if (early) return early
    const f = fake.value ?? {}
    const hint = 'Keep asking the model while its reply has tool calls. Return the content of the first reply without any, and count every request as a step.'
    return [
      detail(
        'Finishes a question that needs three tool calls',
        short.ok && isDeepStrictEqual(short.value, { answer: 'Order PL-2041 is short: Rye loaf 800 g (needs 1, 0 in stock).', steps: 4 }),
        hint,
        show(short)
      ),
      detail(
        'Finishes a question that needs two tool calls',
        stocked.ok && isDeepStrictEqual(stocked.value, { answer: 'Everything in order PL-2043 is in stock.', steps: 3 }),
        hint,
        show(stocked)
      ),
      detail(
        'Finishes a question that needs one tool call',
        status.ok && isDeepStrictEqual(status.value, { answer: 'Order PL-2042 is being packed, expected by 17:00.', steps: 2 }),
        hint,
        show(status)
      ),
      detail(
        'Each request carries the whole conversation so far',
        fake.ok && isDeepStrictEqual(f.messageCounts, [2, 4, 6]) && isDeepStrictEqual(f.lastRoles, ['system', 'user', 'assistant', 'tool', 'assistant', 'tool']),
        'With a scripted model, the requests should hold 2, then 4, then 6 messages: system and user, then an assistant message and its tool result per step.',
        show(fake)
      ),
      detail(
        'Returns the final answer and step count',
        fake.ok && isDeepStrictEqual(f.result, { answer: 'Scripted answer.', steps: 3 }) && f.toolsSent?.includes('check_stock'),
        'With a scripted model that answers on its third reply, runAgent should return { answer: that content, steps: 3 } and send toolSpecs every time.',
        show(fake)
      ),
      detail('agent.ts type-checks', types.passed, 'TypeScript reports errors in src/agent.ts.', types.output)
    ]
  },

  async 'step-limit'(t) {
    const dir = await sandbox(t)
    const [lab, three, byDefault, enough] = await Promise.all([
      t.call(dir, 'src/agent.ts', 'runAgent', ['Wait until order PL-2047 is delivered, then tell me.', { maxSteps: 3 }]),
      t.call(dir, '.grader/drive.mjs', 'endless', [3]),
      t.call(dir, '.grader/drive.mjs', 'endless', []),
      t.call(dir, '.grader/drive.mjs', 'justEnough', [4])
    ])
    const early = notImplemented('runAgent', lab, three)
    if (early) return early
    const [a, b, c] = [three.value ?? {}, byDefault.value ?? {}, enough.value ?? {}]
    return [
      detail(
        'A run that never ends throws StepLimitError',
        !lab.ok && /^StepLimitError/.test(lab.error),
        lab.ok
          ? 'runAgent returned for a question the model keeps calling tools for. It should stop and throw a StepLimitError.'
          : lab.timedOut
            ? 'runAgent was still running after 15 seconds. Nothing stops the loop when the model keeps asking for tools.'
            : 'runAgent threw, but not a StepLimitError. Throw new StepLimitError(maxSteps) when the limit is reached.',
        show(lab)
      ),
      detail(
        'Stops after exactly maxSteps requests',
        three.ok && a.errorName === 'StepLimitError' && a.requests === 3 && a.errorSteps === 3,
        `With maxSteps 3 and a model that never stops, runAgent made ${a.requests} request(s). It should make 3, then throw StepLimitError(3).`,
        show(three)
      ),
      detail(
        'Uses 6 steps when no limit is given',
        byDefault.ok && b.errorName === 'StepLimitError' && b.requests === 6,
        `Without a maxSteps option, runAgent made ${b.requests} request(s) before stopping. The default limit is 6.`,
        show(byDefault)
      ),
      detail(
        'An answer on the last allowed step still counts',
        enough.ok && isDeepStrictEqual(c.result, { answer: 'Made it.', steps: 4 }),
        'With maxSteps 4 and a model that answers on its fourth reply, runAgent should return the answer. Look for an off-by-one in your limit.',
        show(enough)
      )
    ]
  }
}
