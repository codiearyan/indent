// Shared by every issue's grader/checks.mjs.
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'

const helpers = fileURLToPath(new URL('./drive-helpers.mjs', import.meta.url))

export const same = isDeepStrictEqual

// Each case runs one export of grader/drive.mjs in its own process. A case passes when
// `pass(value)` is true, or when the value deep-equals `expected`.
export async function runCases(t, fnName, cases) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': helpers
  })
  const runs = await Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [])))
  const text = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
  const unwritten = runs.find((r) => /Not implemented/.test(text(r)))
  if (unwritten) {
    return [
      {
        name: `${fnName} is implemented`,
        passed: false,
        message: `${fnName} still throws 'Not implemented'. Replace that line with your code.`,
        output: text(unwritten)
      }
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    const passed = r.ok && (c.pass ? Boolean(c.pass(r.value)) : isDeepStrictEqual(r.value, c.expected))
    return {
      name: c.name,
      passed,
      message: passed ? undefined : r.ok ? c.hint : `Your code crashed the check here. ${c.hint}`,
      output: `${c.setup}\n${r.ok ? `got ${text(r)}` : text(r)}`
    }
  })
}
