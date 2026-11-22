import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { build, fail, find, JOINED, line, pass, printedText } from '../../grading.mjs'

const FILE = 'src/welcome.cpp'
const WELCOME = 'Welcome to Tolliver Clockworks'
const HOURS = ['Open Tuesday to Saturday', 'Closed for lunch from 1 to 2']
const NOTICE = 'Free cleaning with every repair'

const loose = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** The text of every // comment in a file, with quoted text ignored. */
function comments(text) {
  return text
    .split('\n')
    .map((l) => {
      const masked = l.replace(/"(?:\\.|[^"\\])*"/g, (q) => ' '.repeat(q.length))
      const at = masked.indexOf('//')
      return at === -1 ? null : l.slice(at + 2).trim()
    })
    .filter((c) => c !== null)
}

export const checks = {
  async name(t) {
    const built = await build(t, { file: FILE, task: 1 })
    if (built.problem) return built.problem
    const { stdout } = built.runs[0]
    const found = find(stdout, line(WELCOME))
    const close = !found && stdout.split('\n').some((l) => loose(l).includes(loose(WELCOME)))
    return [
      {
        name: 'Prints the welcome',
        passed: found === 'ok',
        message:
          found === 'ok'
            ? undefined
            : found === 'joined'
              ? JOINED
              : close
                ? 'Close. One line is nearly the welcome. Compare it letter by letter with the task: capital letters and spaces count, and nothing extra goes on the line.'
                : 'No line prints the welcome yet. Under // Task 1, send it to std::cout with <<, with the text in double quotes and "\\n" at the end.',
        output: printedText(stdout)
      }
    ]
  },

  async hours(t) {
    const built = await build(t, { file: FILE, task: 2 })
    if (built.problem) return built.problem
    const { stdout } = built.runs[0]
    const printed = stdout.split('\n').map((l) => l.trimEnd())
    const found = HOURS.map((h) => find(stdout, line(h)))
    const both = found.every((f) => f === 'ok')
    const firstAt = printed.indexOf(HOURS[0])
    const inOrder = both && printed.indexOf(HOURS[1]) === firstAt + 1
    return [
      {
        name: 'Prints both lines of the hours',
        passed: both,
        message: both
          ? undefined
          : found.includes('joined')
            ? JOINED
            : 'One or both lines of the hours are missing. Print each one, with the text exactly as the task writes it.',
        output: printedText(stdout)
      },
      {
        name: 'Prints them in order, one after the other',
        passed: inOrder,
        message: inOrder
          ? undefined
          : both
            ? 'Both lines are there, but not one right after the other in the order the task gives. The program runs its lines from top to bottom.'
            : 'Print both lines first.'
      }
    ]
  },

  async notice(t) {
    const built = await build(t, { file: FILE, task: 3 })
    if (built.problem) return built.problem
    const { stdout } = built.runs[0]
    const off = !stdout.includes(NOTICE)
    const kept = built.section.text.includes(NOTICE)
    return [
      {
        name: 'The old notice is no longer printed',
        passed: off,
        message: off
          ? undefined
          : 'The notice still prints. Look at the line under // Task 3: what makes the compiler skip a line?',
        output: printedText(stdout)
      },
      {
        name: 'The line is still under Task 3, as a comment',
        passed: off && kept,
        message: !off
          ? 'Switch the notice off first.'
          : kept
            ? undefined
            : 'The notice is gone from the file. Kasimir wants to keep it, switched off, in case it comes back. Put the line back under // Task 3 and turn it into a comment.'
      }
    ]
  },

  async comment(t) {
    const built = await build(t, { file: FILE, task: 4 })
    if (built.problem) return built.problem
    const starter = new Set(comments(await readFile(t.chapterPath(`starter/${FILE}`), 'utf8')))
    const text = await readFile(join(t.workspace, FILE), 'utf8')
    const mine = comments(text).filter(
      (c) =>
        !starter.has(c) &&
        !c.includes(NOTICE) &&
        !c.includes('std::cout') &&
        c.split(/\s+/).length >= 2
    )
    return [
      mine.length > 0
        ? pass('Has a comment of your own', mine[0])
        : fail(
            'Has a comment of your own',
            'Check cannot find a comment of your own. Write a line that starts with // and a few words after it. The comments that came with the file, and the switched-off notice, do not count.'
          )
    ]
  }
}
