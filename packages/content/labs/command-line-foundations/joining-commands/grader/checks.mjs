import { join } from 'node:path'
import {
  changedNote,
  check,
  isFile,
  lineDiff,
  linesOf,
  names,
  noted,
  preview,
  quoted,
  saved,
  starterLines
} from '../../grading.mjs'

const SOLD = 'market/sold.txt'
const RESET = 'Reset puts the starter files back as they were.'
const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i])
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/** In order by the plain character order, or by the order a locale-aware sort gives. */
const inOrder = (lines) =>
  same(lines, [...lines].sort()) ||
  same(
    lines,
    [...lines].sort((a, b) => a.localeCompare(b))
  )

/** Added when a saved file is empty: the usual cause is a command that read the file it saved into. */
const emptied = (t, file) =>
  isFile(t.workspace, file)
    ? ` If the command read ${file} itself, the shell emptied the file before the command started.`
    : ''

function soldCounts(t) {
  const counts = new Map()
  for (const item of starterLines(t, SOLD)) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

function diffMessage(file, got, want, what) {
  const { missing, extra } = lineDiff(got, want)
  if (extra.length && want.includes(extra[0]))
    return `${quoted(extra[0])} is in ${file} more than once.`
  if (extra.length) return `${file} has ${quoted(extra[0])}, which is not ${what}.`
  return `${file} is missing ${plural(missing.length, 'line')}.`
}

export const checks = {
  async items(t) {
    const name = 'items.txt lists every item once, in order'
    const file = 'items.txt'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, emptied(t, file) + changedNote(t, SOLD))]
    const { lines } = got
    const output = preview(file, lines, 12)
    const fail = (message) => [check(name, false, message + changedNote(t, SOLD), output)]
    const items = soldCounts(t).map(([item]) => item)
    if (lines.every((l) => /^\d+\s/.test(l))) {
      return fail('Each line starts with a count. items.txt wants only the names of the items.')
    }
    const repeat = lines.find((l, i) => lines.indexOf(l) !== i)
    if (repeat !== undefined) {
      const together = lines.every((l, i) => i === 0 || l !== lines[i - 1])
      return fail(
        together
          ? `${quoted(repeat)} is in items.txt more than once. uniq only drops a line that repeats the line right above it, so the same items have to sit together first.`
          : `${quoted(repeat)} is in items.txt more than once. Each item goes in once.`
      )
    }
    const { missing, extra } = lineDiff(lines, items)
    if (missing.length || extra.length)
      return fail(diffMessage(file, lines, items, 'an item sold at the market'))
    if (!inOrder(lines)) return fail('Every item is there once, but not in alphabetical order.')
    return [check(name, true, '', output)]
  },

  async top(t) {
    const name = 'top-five.txt has the five best sellers, the most first'
    const file = 'top-five.txt'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, emptied(t, file) + changedNote(t, SOLD))]
    const { lines } = got
    const output = preview(file, lines, 12)
    const fail = (message) => [check(name, false, message + changedNote(t, SOLD), output)]
    const counts = soldCounts(t)
    const count = new Map(counts)
    const rows = []
    for (const line of lines) {
      const m = line.match(/^(\d+)\s+(\S.*)$/)
      if (!m) {
        return fail(
          count.has(line)
            ? 'The lines have the items but not how many were sold. Each line needs the count too.'
            : `${quoted(line)} is not a count and an item.`
        )
      }
      rows.push([m[2], Number(m[1])])
    }
    const unknown = rows.find(([item]) => !count.has(item))
    if (unknown) return fail(`${quoted(unknown[0])} is not an item in ${SOLD}.`)
    const low = rows.find(([item, n]) => n < count.get(item))
    if (low) {
      return fail(
        `The count for ${low[0]} is lower than the number sold. Repeats are counted together only when they sit next to each other, so the same items have to be put together first.`
      )
    }
    const off = rows.find(([item, n]) => n !== count.get(item))
    if (off) return fail(`The count for ${off[0]} is not the number sold.`)
    const top = counts.slice(0, 5).map(([item]) => item)
    const got5 = rows.slice(0, 5).map(([item]) => item)
    if (
      same(
        got5,
        counts
          .slice(-5)
          .reverse()
          .map(([item]) => item)
      ) ||
      same(
        got5,
        counts.slice(-5).map(([item]) => item)
      )
    ) {
      return fail(
        'These are the five items that sold least. Hesper wants the best sellers, the most first.'
      )
    }
    if (rows.length > 5 && same(got5, top)) {
      return fail(
        `top-five.txt has ${rows.length} lines. The first five are right: keep only those.`
      )
    }
    if (rows.length < 5)
      return fail(`top-five.txt has ${plural(rows.length, 'line')}. Hesper wants five.`)
    if (same(got5, top)) return [check(name, true, '', output)]
    if (same([...got5].sort(), [...top].sort()))
      return fail('These are the five best sellers, but not in order with the most first.')
    return fail('These are not the five items that sold most. Compare the counts of every item.')
  },

  async done(t) {
    const name = "jobs-done.txt has today's finished jobs at its end"
    const file = 'jobs-done.txt'
    const output = (lines) =>
      preview(file, lines.slice(-8), 8).replace(/^jobs-done\.txt/, 'jobs-done.txt, its last lines')
    if (!isFile(t.workspace, file))
      return [check(name, false, `jobs-done.txt is gone from the top folder. ${RESET}`, '')]
    const lines = linesOf(join(t.workspace, file))
    const fail = (message) => [check(name, false, message, output(lines))]
    const before = starterLines(t, file)
    const today = starterLines(t, 'logs/today.log')
    const finished = today.filter((l) => l.endsWith(' finished'))
    if (same(lines, [...before, ...finished])) return [check(name, true, '', output(lines))]
    if (!lines.length) {
      return fail(
        `jobs-done.txt is empty. Sending output into the file a command reads empties it before the command starts. ${RESET}`
      )
    }
    if (same(lines, before)) return fail("jobs-done.txt has none of today's finished jobs yet.")
    if (!same(lines.slice(0, before.length), before)) {
      return fail(
        same(lines, finished)
          ? `The lines jobs-done.txt held before are gone, and only today's jobs are left: > replaced the whole file. ${RESET} Then add today's lines to its end.`
          : `The lines jobs-done.txt held at the start are no longer all there, at its top. ${RESET}`
      )
    }
    const added = lines.slice(before.length)
    if (same(added, [...finished, ...finished])) {
      return fail(
        `Today's finished jobs are in jobs-done.txt twice: the command ran more than once. ${RESET} Then add them once.`
      )
    }
    const { missing, extra } = lineDiff(added, finished)
    if (extra.length) {
      return fail(
        today.includes(extra[0])
          ? `jobs-done.txt also got ${quoted(extra[0])}, which is not a finished job. Add only the finished ones. ${RESET}`
          : `jobs-done.txt got ${quoted(extra[0])}, which is not one of today's finished jobs. ${RESET}`
      )
    }
    if (missing.length)
      return fail(
        `${missing.length} of today's finished jobs ${missing.length === 1 ? 'is' : 'are'} missing.`
      )
    return fail("Today's finished jobs are there, but not in the order of the log.")
  },

  async stock(t) {
    const name = 'stock.txt is in alphabetical order, with every line'
    const file = 'stock.txt'
    if (!isFile(t.workspace, file))
      return [check(name, false, `stock.txt is gone from the top folder. ${RESET}`, '')]
    const lines = linesOf(join(t.workspace, file))
    const output = preview(file, lines, 14)
    const fail = (message) => [check(name, false, message, output)]
    const start = starterLines(t, file)
    const sorted = [...start].sort()
    if (!lines.length) {
      return fail(
        `stock.txt is empty. Sending output into the file a command reads empties it before the command starts. ${RESET}`
      )
    }
    const { missing, extra } = lineDiff(lines, start)
    if (missing.length || extra.length)
      return fail(`${diffMessage(file, lines, start, 'in the stock list')} ${RESET}`)
    if (inOrder(lines)) return [check(name, true, '', output)]
    if (same(lines, [...sorted].reverse()))
      return fail('stock.txt is sorted, but backwards. Alphabetical order starts at a.')
    const copy = names(t.workspace).find(
      (n) => n !== file && same(linesOf(join(t.workspace, n)) ?? [], sorted)
    )
    if (copy)
      return fail(`The sorted list is in ${copy}, but stock.txt itself is still in its old order.`)
    return fail('stock.txt has every line, but is not in alphabetical order yet.')
  }
}
