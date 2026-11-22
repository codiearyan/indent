import { readFile } from 'node:fs/promises'
import { source } from '../../grading.mjs'

const FILE = 'src/first-line.js'
const WELCOME = 'Welcome to Wickhollow Candles'
const NOTE = ['Thank you for your order', 'Poured by hand in Wickhollow']
const OFFER = 'Free candle with every order'

const loose = (line) => line.toLowerCase().replace(/[^a-z]/g, '')

/** Runs the file the way the learner does and returns its printed lines, or one failing detail. */
async function printed(t) {
  const dir = await t.sandbox()
  const r = await t.node(dir, [FILE])
  if (r.code === 0 && !r.timedOut) return { lines: r.stdout.split('\n').map((l) => l.trimEnd()) }
  return {
    problem: {
      name: `${FILE} runs`,
      passed: false,
      message: `${FILE} stops with an error, so Check cannot see what it prints. Run node ${FILE} in the terminal, read the line the error points at, fix it and check again. A missing quote or bracket is the usual cause.`,
      output: r.timedOut ? 'Timed out' : r.stderr
    }
  }
}

const shown = (lines) => `It printed:\n${lines.join('\n')}`

/** The text of every // comment in a file, with quoted text ignored. */
function comments(text) {
  return text
    .split('\n')
    .map((line) => {
      const masked = line.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, (q) => ' '.repeat(q.length))
      const at = masked.indexOf('//')
      return at === -1 ? null : line.slice(at + 2).trim()
    })
    .filter((c) => c !== null)
}

export const checks = {
  async welcome(t) {
    const { lines, problem } = await printed(t)
    if (problem) return [problem]
    const passed = lines.includes(WELCOME)
    const close = !passed && lines.some((l) => loose(l) === loose(WELCOME))
    return [
      {
        name: 'Prints the welcome',
        passed,
        message: passed
          ? undefined
          : close
            ? 'Close. One line is nearly the welcome. Compare it letter by letter with the task: capital letters and spaces count, and nothing extra goes on the line.'
            : 'No line printed the welcome yet. Under // Task 1, print it with console.log, with the text in quotes.',
        output: shown(lines)
      }
    ]
  },

  async note(t) {
    const { lines, problem } = await printed(t)
    if (problem) return [problem]
    const first = lines.indexOf(NOTE[0])
    const second = lines.indexOf(NOTE[1])
    const both = first !== -1 && second !== -1
    return [
      {
        name: 'Prints both lines of the note',
        passed: both,
        message: both
          ? undefined
          : 'One or both lines of the note are missing. Each line needs its own console.log, and the text must match the task exactly.',
        output: shown(lines)
      },
      {
        name: 'Prints them in order, one after the other',
        passed: both && second === first + 1,
        message:
          both && second !== first + 1
            ? 'Both lines are there, but not one right after the other in the order the task gives. Node runs your lines from top to bottom.'
            : both
              ? undefined
              : 'Print both lines first.'
      }
    ]
  },

  async offer(t) {
    const { lines, problem } = await printed(t)
    if (problem) return [problem]
    const off = !lines.some((l) => l.includes(OFFER))
    const kept = comments(await source(t, FILE)).some((c) => c.includes(OFFER))
    return [
      {
        name: 'The old offer is no longer printed',
        passed: off,
        message: off
          ? undefined
          : 'The offer still prints. Look at the line under // Task 3: what makes Node skip a line?',
        output: shown(lines)
      },
      {
        name: 'The line is still in the file, as a comment',
        passed: off && kept,
        message: !off
          ? 'Switch the offer off first.'
          : kept
            ? undefined
            : 'The offer is gone from the file. Theo wants to keep it, switched off, in case it comes back. Put the line back and turn it into a comment.'
      }
    ]
  },

  async comment(t) {
    const { problem } = await printed(t)
    if (problem) return [problem]
    const starter = new Set(comments(await readFile(t.chapterPath(`starter/${FILE}`), 'utf8')))
    const mine = comments(await source(t, FILE)).filter(
      (c) =>
        !starter.has(c) &&
        !c.includes(OFFER) &&
        !c.includes('console.log') &&
        c.split(/\s+/).length >= 2
    )
    return [
      {
        name: 'Has a comment of your own',
        passed: mine.length > 0,
        message:
          mine.length > 0
            ? undefined
            : 'Check cannot find a comment of your own. Write a line that starts with // and a few words after it. The comments that came with the file, and the switched-off offer, do not count.'
      }
    ]
  }
}
