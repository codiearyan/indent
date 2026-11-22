import { readFile } from 'node:fs/promises'
import {
  fail,
  lineProblem,
  LINE_WORDS,
  moved,
  pass,
  printed,
  printedElsewhere,
  problem,
  runFile
} from '../../grading.mjs'

const FILE = 'first_line.py'
const NAME = 'Brackenridge Mountain Rescue'
const RADIO = ['Base to all teams, radio check', 'Reply with your call sign']
const OLD = 'old base on Cluny Road'

async function ran(t, task, options) {
  const r = await runFile(t, FILE, options)
  return { r, problem: problem(r, FILE, task) }
}

const all = (r) => [...r.parts.values()].flatMap((part) => part.lines)

export const checks = {
  async welcome(t) {
    const { r, problem: p } = await ran(t, 1)
    if (p) return [p]
    const out = r.parts.get(1).lines
    const near = lineProblem(out, NAME)
    if (!near) return [pass("Prints the team's name", printed(null, out))]
    const at = printedElsewhere(r, 1, NAME)
    return [
      fail(
        "Prints the team's name",
        at !== undefined
          ? moved(at, 1)
          : (LINE_WORDS[near] ??
              "No line under # Task 1 prints the team's name yet. Print it with print, with the text inside quotes."),
        printed(null, out)
      )
    ]
  },

  async radio(t) {
    const { r, problem: p } = await ran(t, 2)
    if (p) return [p]
    const out = r.parts.get(2).lines
    const first = out.indexOf(RADIO[0])
    const second = out.indexOf(RADIO[1])
    const both = first !== -1 && second !== -1
    const near =
      !both &&
      (RADIO.map((line) => lineProblem(out, line)).find((n) => n && n !== 'none') ?? 'none')
    const elsewhere = RADIO.map((line) => printedElsewhere(r, 2, line)).find(
      (at) => at !== undefined
    )
    return [
      both
        ? pass('Prints both lines of the radio check', printed(null, out))
        : fail(
            'Prints both lines of the radio check',
            elsewhere !== undefined
              ? moved(elsewhere, 2)
              : (LINE_WORDS[near] ??
                  'One or both lines of the radio check are missing under # Task 2. Each line needs its own print, and the text must match the task exactly.'),
            printed(null, out)
          ),
      both && second === first + 1
        ? pass('Prints them in order, one right after the other')
        : fail(
            'Prints them in order, one right after the other',
            both
              ? 'Both lines are there, but not one right after the other in the order the task gives. Python runs the lines from top to bottom.'
              : 'Print both lines first.'
          )
    ]
  },

  async old(t) {
    const r = await runFile(t, FILE, { comments: true })
    const p = problem(r, FILE, 3)
    if (p) return [p]
    const off = !all(r).some((line) => line.includes(OLD))
    const kept = r.comments.some((c) => c.text.includes(OLD))
    return [
      off
        ? pass('The old meeting place is no longer printed')
        : fail(
            'The old meeting place is no longer printed',
            'The old meeting place still prints. Look at the line under # Task 3: what makes Python skip a line?',
            printed(null, all(r))
          ),
      off && kept
        ? pass('The line is still in the file, as a comment')
        : fail(
            'The line is still in the file, as a comment',
            off
              ? 'Check cannot find the line as a comment. Rhona wants the same line kept, switched off: put it back as it was, with # at its start and its words unchanged.'
              : 'Switch the old meeting place off first.'
          )
    ]
  },

  async note(t) {
    const r = await runFile(t, FILE, { comments: true })
    const p = problem(r, FILE, 4)
    if (p) return [p]
    const starter = new Set(
      (await readFile(t.chapterPath(`starter/${FILE}`), 'utf8'))
        .split('\n')
        .filter((line) => line.trim().startsWith('#'))
        .map((line) => line.trim().slice(1).trim())
    )
    const mine = r.comments.filter(
      (c) =>
        !starter.has(c.text) &&
        !c.text.includes(OLD) &&
        !c.text.includes('print(') &&
        c.text.split(/\s+/).length >= 2
    )
    return [
      mine.length > 0
        ? pass('Has a comment of your own')
        : fail(
            'Has a comment of your own',
            'Check cannot find a comment of your own with at least two words. Write a line that starts with # and a few words after it. The comments that came with the file, and the switched-off meeting place, do not count.'
          )
    ]
  }
}
