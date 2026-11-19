// Shared by every chapter's grader/checks.mjs: behavior cases plus the type checks.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

/** A sandbox holding the chapter's driver and the task's hidden type tests under .grader/. */
export function prepare(t, task) {
  return t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/uses.ts': t.chapterPath(`grader/types/${task}.uses.ts`),
    '.grader/misuse.ts': t.chapterPath(`grader/types/${task}.misuse.ts`)
  })
}

const shown = (r) => (r.ok ? `returned ${JSON.stringify(r.value)}` : `threw ${r.error}`)

/**
 * Each case: { name, fn, args?, file?, expected | throws, setup, hint }.
 * `file` defaults to the driver; `throws` is true or a RegExp the error must match.
 */
export async function behavior(t, dir, cases) {
  const runs = await Promise.all(
    cases.map((c) => t.call(dir, c.file ?? '.grader/drive.mjs', c.fn, c.args ?? []))
  )
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: 'Your code runs',
        passed: false,
        message: "A function for this task still throws 'Not implemented'. Replace that line with your code.",
        output: unwritten.error
      }
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    const passed =
      'throws' in c
        ? !r.ok && (c.throws === true || c.throws.test(r.error))
        : r.ok && isDeepStrictEqual(r.value, c.expected)
    return {
      name: c.name,
      passed,
      message: passed ? undefined : c.hint,
      output: `${c.setup}\n${shown(r)}`
    }
  })
}

const ERROR_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/

function parseErrors(output) {
  const errors = []
  for (const line of output.split(/\r?\n/)) {
    const m = ERROR_LINE.exec(line.trim())
    if (m) {
      errors.push({ path: m[1].replaceAll('\\', '/'), line: Number(m[2]), code: m[4], text: line.trim() })
    } else if (errors.length > 0 && /^\s+\S/.test(line)) {
      errors.at(-1).text += `\n${line}`
    }
  }
  return errors
}

// Comments and string literals removed, so only code is searched for `any`.
const strip = (source) =>
  source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    (m) => m.replace(/[^\n]/g, ' ')
  )

async function explain(dir, rel, errors) {
  const lines = (await readFile(join(dir, rel), 'utf8')).split('\n')
  return errors
    .map((e) => {
      const code = lines[e.line - 1]?.trim() ?? ''
      if (e.code === 'TS2578') {
        const reason = code.replace(/^.*@ts-expect-error:?\s*/, '')
        return `Compiles, but should be a type error: ${reason}`
      }
      const shownCode = lines[e.line - 1]?.includes('@ts-expect-error') ? lines[e.line]?.trim() : code
      return `Does not compile: ${shownCode}\n  ${e.text.replace(/^.*?error /, '')}`
    })
    .join('\n\n')
}

/** Type-checks `file` with the hidden uses and misuse tests in one tsc run and reports four checks. */
export async function types(t, dir, file) {
  const [r, source] = await Promise.all([
    t.typecheck(dir, [file, '.grader/uses.ts', '.grader/misuse.ts']),
    readFile(join(dir, file), 'utf8')
  ])
  const errors = parseErrors(r.output)
  const crashed = !r.passed && errors.length === 0
  // Errors in other task files belong to those tasks.
  const own = errors.filter((e) => e.path === file)
  const uses = errors.filter((e) => e.path === '.grader/uses.ts')
  const misuse = errors.filter((e) => e.path === '.grader/misuse.ts')
  const anyLines = strip(source)
    .split('\n')
    .flatMap((line, i) => (/\bany\b/.test(line) ? [`line ${i + 1}: ${source.split('\n')[i].trim()}`] : []))

  return [
    {
      name: `${file} type-checks in strict mode`,
      passed: !crashed && own.length === 0,
      message: `TypeScript reports errors in your code. Run \`npm run types\` in the terminal and fix them from the top. A parameter with no type is the most common one.`,
      output: crashed ? r.output : own.map((e) => e.text).join('\n')
    },
    {
      name: `${file} does not use any`,
      passed: anyLines.length === 0,
      message: '`any` switches type checking off, so the check does not accept it. Use a real type, or `unknown` and narrow it.',
      output: anyLines.join('\n')
    },
    {
      name: 'Correct uses of your exports compile',
      passed: !crashed && uses.length === 0,
      message:
        'Hidden code that uses your exports the right way does not compile. Compare your export names, parameter types and return types with the task.',
      output: crashed ? r.output : await explain(dir, '.grader/uses.ts', uses)
    },
    {
      name: 'Wrong uses of your exports are type errors',
      passed: !crashed && misuse.length === 0,
      message:
        'Hidden code that misuses your exports still compiles, so a type is looser than the task asks. Look for a type that is too wide or a missing null or undefined.',
      output: crashed ? r.output : await explain(dir, '.grader/misuse.ts', misuse)
    }
  ].map((d) => (d.passed ? { ...d, message: undefined } : d))
}
