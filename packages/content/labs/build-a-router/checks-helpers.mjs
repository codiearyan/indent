// Shared by every issue's grader/checks.mjs.
import { fileURLToPath } from 'node:url'

const helpers = fileURLToPath(new URL('./drive-helpers.mjs', import.meta.url))

export const text = (r) => (r.ok ? JSON.stringify(r.value) : r.error)

const STUCK =
  'Your code never finished here: the check stopped it after a few seconds. Look for a loop that never ends.'

// Said once instead of failing every case, in this order: a file that does not load, the task's own
// function that still throws 'Not implemented', an earlier task that is not done.
function blocker(runs, unwritten) {
  const broken = runs.find((r) => !r.ok && /SyntaxError|does not provide an export|Cannot find module/.test(r.error))
  if (broken) {
    return {
      name: 'Your files load',
      passed: false,
      message: 'A file in src/ does not load, so this task cannot be checked. Fix the error below first.',
      output: broken.error
    }
  }
  const isEarlier = (r) => !r.ok && r.error.includes('NeedsEarlierTask: ')
  if (runs.some((r) => !isEarlier(r) && /Not implemented/.test(text(r)))) {
    return {
      name: 'Your code is written',
      passed: false,
      message: `${unwritten} still throws 'Not implemented'. Replace that line with your code.`,
      output: 'Error: Not implemented'
    }
  }
  const earlier = runs.find(isEarlier)
  if (earlier) {
    return {
      name: 'Earlier tasks are done',
      passed: false,
      message: earlier.error.split('NeedsEarlierTask: ')[1].split('\n')[0],
      output: earlier.error.match(/NeedsEarlierTask: .*/)[0]
    }
  }
  return undefined
}

// Each case runs one export of grader/drive.mjs in its own process, so every case starts with a
// fresh router and a hang or a crash stays inside it. A case passes when `pass(value)` is true;
// `show(value)` is what its output says, and `hint` may be a function of the value.
export async function runCases(t, unwritten, cases, { timeoutMs = 8000, files = {} } = {}) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': helpers,
    ...files
  })
  const runs = await Promise.all(
    cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [], { timeoutMs }))
  )
  const stop = blocker(runs, unwritten)
  if (stop) return [stop]
  return cases.map((c, i) => {
    const r = runs[i]
    const passed = r.ok && Boolean(c.pass(r.value))
    const hint = typeof c.hint === 'function' ? c.hint(r.ok ? r.value : undefined) : c.hint
    const seen = r.ok ? c.show(r.value) : r.timedOut ? 'stopped after a few seconds' : r.error
    return {
      name: c.name,
      passed,
      message: passed ? undefined : r.ok ? hint : r.timedOut ? STUCK : `Your code crashed the check here. ${hint}`,
      output: `${c.setup}\n${seen}`
    }
  })
}

/** One line about a reply from the driver's send(), for a check's output. */
export function said(reply) {
  if (!reply) return 'no reply'
  if (reply.threw && !reply.answered) return `${reply.request}: handle() threw ${reply.threw}`
  if (reply.hung) return `${reply.request}: no answer, and handle() had not finished after 1.5 seconds`
  if (!reply.answered) return `${reply.request}: handle() finished without answering`
  const allow = reply.allow === undefined ? '' : `, allow: ${reply.allow}`
  return `${reply.request}: ${reply.status}${allow}, body ${reply.body}`
}

export const NEVER =
  'Your router never answered this request, and handle() had not finished after 1.5 seconds, so the check stopped waiting. Look for an await on something that never settles.'
