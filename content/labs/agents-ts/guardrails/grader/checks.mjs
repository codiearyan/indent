import { isDeepStrictEqual } from 'node:util'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const detail = (name, passed, message, output) => ({ name, passed, message: passed ? undefined : message, output })

function notImplemented(fn, r) {
  const error = r.ok ? r.value?.error : r.error
  if (!/Not implemented/.test(error ?? '')) return null
  return [detail(`${fn} is implemented`, false, `${fn} still throws 'Not implemented'. Replace that line with your code.`, error)]
}

const drive = (t) => ({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })

const readJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const REFUND = 'Refund order PL-2043 in full, the eggs arrived broken.'

export const checks = {
  async confirm(t) {
    const dir = await t.sandbox(drive(t))
    const g = (name, args, answer) =>
      t.call(dir, '.grader/drive.mjs', 'guard', [name, typeof args === 'string' ? args : JSON.stringify(args), answer])
    const money = { to: 'Ana Ruiz', amount: 5 }
    const [safe, yes, no, laterYes, laterNo, bad, unknown] = await Promise.all([
      g('read_note', { id: 'n1' }, false),
      g('send_money', money, true),
      g('send_money', money, false),
      g('send_money', money, 'later-true'),
      g('send_money', money, 'later-false'),
      g('send_money', { to: 'Ana Ruiz', amount: 'five' }, true),
      g('wire_money', money, true)
    ])
    const early = notImplemented('guardedCall', safe)
    if (early) return early
    const v = (r) => r.value ?? {}
    const body = (r) => readJson(v(r).result?.content)
    const ranOk = (r) => r.ok && isDeepStrictEqual(v(r).ran, ['send_money']) && v(r).result?.refused === false && isDeepStrictEqual(body(r), { sent: 5, to: 'Ana Ruiz' })
    const refusedOk = (r) =>
      r.ok && v(r).ran?.length === 0 && v(r).result?.refused === true && body(r)?.refused === true && typeof body(r)?.reason === 'string'
    return [
      detail(
        'A tool without the flag runs without asking',
        safe.ok && v(safe).asked?.length === 0 && isDeepStrictEqual(body(safe), { note: 'note n1' }) && v(safe).result?.refused === false,
        'Only tools marked needsConfirmation need approval. Others should run straight away, without calling confirm.',
        show(safe)
      ),
      detail(
        'An approved call runs once, after asking with parsed arguments',
        ranOk(yes) && isDeepStrictEqual(v(yes).asked, [{ name: 'send_money', args: money }]),
        'confirm should be called once with { name, args }, args as an object, and the tool should run only after it says yes.',
        show(yes)
      ),
      detail(
        'A refused call never runs and says so',
        refusedOk(no),
        'When confirm says no, do not run the tool. Return refused: true and content with a JSON object holding refused: true and a reason string.',
        show(no)
      ),
      detail(
        'Waits for a confirm that answers later',
        ranOk(laterYes) && refusedOk(laterNo),
        'confirm may return a promise, for example while a person decides. A promise is always truthy, so wait for its answer before deciding.',
        `yes later:\n${show(laterYes)}\n\nno later:\n${show(laterNo)}`
      ),
      detail(
        'Invalid arguments are reported without asking',
        bad.ok && v(bad).asked?.length === 0 && v(bad).ran?.length === 0 && typeof body(bad)?.error === 'string' && v(bad).result?.refused === false,
        'Do not ask a person to approve a call that cannot run. Report the argument error as executeToolCall does.',
        show(bad)
      ),
      detail(
        'An unknown tool is an error, not a question',
        unknown.ok && v(unknown).asked?.length === 0 && typeof body(unknown)?.error === 'string' && v(unknown).result?.refused === false,
        'A tool that is not in the registry should come back as an error result, without calling confirm.',
        show(unknown)
      )
    ]
  },

  async trace(t) {
    const [dir, reference] = await Promise.all([
      t.sandbox(drive(t)),
      t.sandbox({
        ...drive(t),
        'src/guard.ts': t.chapterPath('solution/src/guard.ts'),
        'src/agent.ts': t.chapterPath('solution/src/agent.ts')
      })
    ])
    const runs = [
      ['Where is order PL-2041?', true],
      [REFUND, true],
      [REFUND, false],
      [REFUND, null]
    ]
    const [mine, theirs, types] = await Promise.all([
      Promise.all(runs.map((args) => t.call(dir, '.grader/drive.mjs', 'agent', args))),
      Promise.all(runs.map((args) => t.call(reference, '.grader/drive.mjs', 'agent', args))),
      t.typecheck(dir, ['src/agent.ts', 'src/guard.ts'])
    ])
    const early = notImplemented('runAgent', mine[0])
    if (early) return early
    const same = (i) => mine[i].ok && !mine[i].value.error && isDeepStrictEqual(mine[i].value, theirs[i].value)
    const compare = (i) => `yours:\n${show(mine[i])}\n\nexpected:\n${show(theirs[i])}`
    const traceHint =
      'Compare your trace with the expected one below: one model entry per reply (step, content, call ids), then for each call a tool_call entry and its tool_result or refused entry.'
    return [
      detail('Traces a run without guarded tools', same(0), traceHint, compare(0)),
      detail(
        'Runs an approved refund and traces it',
        same(1),
        `${traceHint} The refund should run once and appear in refunds.`,
        compare(1)
      ),
      detail(
        'Sends a refusal back to the model and traces it',
        same(2),
        'When confirm says no, the model should get the refusal as the tool result and answer that the refund was not approved. The trace shows a refused entry instead of a tool_result.',
        compare(2)
      ),
      detail(
        'Refuses by default when no confirm is given',
        same(3),
        'Without a confirm option, runAgent should refuse every guarded call. Check the default value of confirm.',
        compare(3)
      ),
      detail('agent.ts and guard.ts type-check', types.passed, 'TypeScript reports errors in src/agent.ts or src/guard.ts.', types.output)
    ]
  },

  async test(t) {
    const test = 'src/agent.test.ts'
    const solved = { 'src/guard.ts': t.chapterPath('solution/src/guard.ts'), 'src/agent.ts': t.chapterPath('solution/src/agent.ts') }
    const [good, askAfter, silent] = await Promise.all(
      [
        solved,
        { ...solved, 'src/guard.ts': t.chapterPath('grader/variants/ask-after.ts') },
        { ...solved, 'src/agent.ts': t.chapterPath('grader/variants/silent-refusal.ts') }
      ].map(async (overrides) => t.vitest(await t.sandbox(overrides), test))
    )
    return [
      detail(
        'Passes beside a correct agent',
        good.passed,
        "Your test failed beside a correct guard and agent. Read the output: it may expect something the task does not ask for, or still throw 'Not implemented'.",
        good.output
      ),
      detail(
        'Fails beside a guard that runs the tool before asking',
        !askAfter.passed,
        'Your test passed even though the refund ran before anyone was asked. Its trace looks right, so check what actually happened to the money.',
        askAfter.output
      ),
      detail(
        'Fails beside an agent that hides refusals in the trace',
        !silent.passed,
        'Your test passed beside an agent that records the refusal as an ordinary tool_result. Assert on the trace entries for the refund call.',
        silent.output
      )
    ]
  }
}
