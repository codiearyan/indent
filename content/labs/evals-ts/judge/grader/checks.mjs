import { draftReply, judgeOutcome } from '../../model.mjs'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clean = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const PARSE = [
  ['VERDICT: PASS\nREASON: the draft meets every rule', 'pass', 'the draft meets every rule'],
  ['verdict: fail', 'fail', ''],
  ['VERDICT: PASS  \n\n', 'pass', ''],
  ['Sure, here is my assessment.\nVERDICT: FAIL\nREASON: no order number', 'fail', 'no order number'],
  ['**Verdict:** pass\n**Reason:** polite and short', 'pass', 'polite and short'],
  ['VERDICT: FAIL\nREASON: too long\nVERDICT: FAIL', 'fail', 'too long'],
  ['I cannot pass judgment on the rule "Sounds warm" because I have no way to check it.', 'unknown'],
  ['Having read the draft, I lean towards pass, though it could fail a strict reading.', 'unknown'],
  ['', 'unknown'],
  ['VERDICT: PASS\nOn reflection, VERDICT: FAIL', 'unknown'],
  ['VERDICT: PASSABLE', 'unknown']
]

const hidden = [
  { id: 'x1', ticket: 'Order PB-30561 arrived with a dead fern.' },
  { id: 'x2', ticket: 'My parcel has not shown up yet.' },
  { id: 'x3', ticket: 'Please refund order PB-11111, the box was damaged.' },
  { id: 'x4', ticket: 'The leaves on my monstera are yellow.' },
  { id: 'x5', ticket: 'Where is order PB-55555?' },
  { id: 'x6', ticket: 'I was charged twice for my order.' }
]
const RUBRIC = [
  'Mentions the order number when the customer gave one.',
  'Apologizes when the customer reports a problem.',
  'Does not promise a refund.',
  'Stays under 60 words.'
]

export const checks = {
  async parse(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const r = await t.call(dir, '.grader/drive.mjs', 'parseAll', [PARSE.map(([text]) => text)])
    if (!r.ok) {
      return [{ name: 'verdict.ts loads', passed: false, message: 'Could not load src/verdict.ts. Read the error.', output: r.error }]
    }
    const rows = PARSE.map(([text, verdict, reason], i) => {
      const got = r.value[i]
      const v = got.ok ? got.value : undefined
      const ok =
        v?.verdict === verdict &&
        (verdict === 'unknown' ? /^could not judge/i.test(v.reason ?? '') : v.reason === reason)
      return { ok, line: `${JSON.stringify(text)} -> ${got.ok ? JSON.stringify(v) : `threw: ${got.error}`}` }
    })
    const group = (idx) => idx.map((i) => rows[i])
    const fmt = (rs) => rs.filter((x) => !x.ok).map((x) => x.line).join('\n')
    return clean([
      {
        name: 'A plain verdict line',
        passed: group([0, 1, 2]).every((x) => x.ok),
        message: 'Read the verdict from a "VERDICT: PASS" style line in any case, and the reason from a "REASON:" line, or "" when there is none.',
        output: fmt(group([0, 1, 2]))
      },
      {
        name: 'A verdict wrapped in extra words or markdown',
        passed: group([3, 4, 5]).every((x) => x.ok),
        message: 'The judge sometimes adds a sentence first or bolds its labels. Look for the label anywhere in the text, allowing "*" and ":" after it.',
        output: fmt(group([3, 4, 5]))
      },
      {
        name: 'No verdict label means unknown',
        passed: group([6, 7, 8]).every((x) => x.ok),
        message: 'When there is no verdict label, return unknown with a reason starting "could not judge". A loose "pass" in a sentence is not a verdict.',
        output: fmt(group([6, 7, 8]))
      },
      {
        name: 'Conflicting or partial labels mean unknown',
        passed: group([9, 10]).every((x) => x.ok),
        message: 'Two labels that disagree, or a word that only starts with "pass", should not produce a verdict.',
        output: fmt(group([9, 10]))
      }
    ])
  },

  async judge(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const run = (replies) => t.call(dir, '.grader/drive.mjs', 'scripted', [replies])
    const [clear, retry, never, broken, real, unjudgeable] = await Promise.all([
      run(['VERDICT: PASS\nREASON: fine']),
      run(['It reads well overall.', 'VERDICT: FAIL']),
      run(['Hmm.', 'Still weighing it.', 'VERDICT: PASS']),
      run([{ throws: 'judge offline' }]),
      t.call(dir, 'src/judge.ts', 'judgeDraft', [
        hidden[2].ticket,
        draftReply(hidden[2].ticket),
        RUBRIC
      ]),
      t.call(dir, 'src/judge.ts', 'judgeDraft', ['My fern is fine.', 'Hi there,\nGood to hear.', ['Sounds warm.']])
    ])
    const c = clear.value ?? {}
    const r = retry.value ?? {}
    const second = r.requests?.[1]?.messages ?? []
    const firstLen = r.expectedMessages?.length ?? 0
    return clean([
      {
        name: 'Asks the judge model once with the rubric prompt',
        passed:
          clear.ok && c.result?.verdict === 'pass' && c.requests.length === 1 &&
          c.requests[0].model === 'evals-judge-1' && c.requests[0].temperature === 0 &&
          same(c.requests[0].messages, c.expectedMessages),
        message: 'With a clear reply, judgeDraft should make one request to JUDGE_MODEL with temperature 0 and the messages from buildJudgeMessages, then return the parsed verdict.',
        output: show(clear)
      },
      {
        name: 'Asks once more when the verdict is unclear',
        passed:
          retry.ok && r.result?.verdict === 'fail' && r.requests.length === 2 &&
          second.length === firstLen + 2 &&
          same(second.slice(0, firstLen), r.expectedMessages) &&
          same(second[firstLen], { role: 'assistant', content: 'It reads well overall.' }) &&
          same(second[firstLen + 1], { role: 'user', content: r.followUp }),
        message: 'When the first reply has no verdict, send the same messages plus the judge reply as an assistant message and FOLLOW_UP as a user message.',
        output: show(retry)
      },
      {
        name: 'Stops after 2 requests and reports could not judge',
        passed:
          never.ok && never.value.requests.length === 2 && never.value.result?.verdict === 'unknown' &&
          /^could not judge/i.test(never.value.result.reason ?? ''),
        message: 'If the second reply is still unclear, return unknown. Never make a third request, and never guess.',
        output: show(never)
      },
      {
        name: 'A failed request is unknown, not a crash',
        passed:
          broken.ok && broken.value.result?.verdict === 'unknown' &&
          /^could not judge/i.test(broken.value.result.reason ?? '') &&
          /judge offline/.test(broken.value.result.reason ?? ''),
        message: 'When the request throws, return unknown with a reason starting "could not judge" that includes the error message.',
        output: show(broken)
      },
      {
        name: 'Works with the lab judge',
        passed:
          real.ok && real.value?.verdict === 'fail' && unjudgeable.ok && unjudgeable.value?.verdict === 'unknown',
        message: 'Run against the lab judge, a rambling first reply should end in a verdict after the follow-up, and a rule the judge cannot check should end in unknown.',
        output: `${show(real)}\n${show(unjudgeable)}`
      }
    ])
  },

  async report(t) {
    const dir = await t.sandbox()
    const [run, tone, empty, types] = await Promise.all([
      t.call(dir, 'src/judge.ts', 'evaluateDrafts', [hidden, RUBRIC]),
      t.call(dir, 'src/judge.ts', 'evaluateDrafts', [hidden.slice(0, 3), [...RUBRIC, 'Sounds warm.']]),
      t.call(dir, 'src/judge.ts', 'evaluateDrafts', [[], RUBRIC]),
      t.typecheck(dir, ['src/verdict.ts', 'src/judge.ts'])
    ])
    const want = hidden.map((c) => {
      const draft = draftReply(c.ticket)
      return { id: c.id, draft, verdict: judgeOutcome(c.ticket, draft, RUBRIC) }
    })
    const got = run.value?.results ?? []
    const perCase = want.every(
      (w, i) => got[i]?.id === w.id && got[i].draft === w.draft && got[i].verdict === w.verdict
    )
    const pass = want.filter((w) => w.verdict === 'pass').length
    const fail = want.filter((w) => w.verdict === 'fail').length
    const tv = tone.value ?? {}
    return clean([
      {
        name: 'Each draft gets its own verdict',
        passed: run.ok && perCase,
        message: run.ok
          ? 'results should hold { id, draft, verdict, reason } per case, in order, with the draft from draftReply and the verdict from judgeDraft.'
          : 'evaluateDrafts threw. Read the error.',
        output: run.ok ? JSON.stringify(got.map((g) => [g.id, g.verdict]), null, 0) : run.error
      },
      {
        name: 'Counts and pass rate',
        passed:
          run.ok && run.value.pass === pass && run.value.fail === fail && run.value.unknown === 0 &&
          Math.abs(run.value.passRate - pass / (pass + fail)) < 1e-9,
        message: `Expected pass ${pass}, fail ${fail}, unknown 0, and passRate pass / (pass + fail).`,
        output: run.ok ? JSON.stringify({ ...run.value, results: undefined }) : run.error
      },
      {
        name: 'Unknown verdicts are reported, never counted as pass or fail',
        passed: tone.ok && tv.pass === 0 && tv.fail === 0 && tv.unknown === 3 && tv.passRate === 0,
        message: 'With a rule the judge cannot check, every case is unknown. They should be counted as unknown, left out of the pass rate, and passRate should be 0.',
        output: tone.ok ? JSON.stringify({ ...tv, results: tv.results?.map((x) => [x.id, x.verdict]) }) : tone.error
      },
      {
        name: 'An empty list has a pass rate of 0',
        passed: empty.ok && empty.value?.passRate === 0 && empty.value.unknown === 0,
        message: 'With no cases, the counts and passRate should all be 0, not NaN.',
        output: show(empty)
      },
      {
        name: 'verdict.ts and judge.ts type-check',
        passed: types.passed,
        message: 'TypeScript reports errors in src/verdict.ts or src/judge.ts.',
        output: types.output
      }
    ])
  }
}
