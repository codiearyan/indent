import {
  changedNote,
  check,
  lineDiff,
  names,
  noted,
  preview,
  quoted,
  read,
  saved,
  starterLines
} from '../../grading.mjs'

const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i])
const endsWith = (lines, tail) => tail.length > 0 && same(lines.slice(-tail.length), tail)
const startsWith = (lines, head) => head.length > 0 && same(lines.slice(0, head.length), head)
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

function diffMessage(file, got, want, from) {
  const { missing, extra } = lineDiff(got, want)
  if (!missing.length && !extra.length)
    return `Every line is there, but not in the order of ${from}.`
  if (extra.length && want.includes(extra[0]))
    return `${file} has ${plural(extra.length, 'line')} more than once, such as ${quoted(extra[0])}. Each line of ${from} goes in once.`
  if (extra.length)
    return `${file} has ${plural(extra.length, 'line')} that ${extra.length > 1 ? 'are' : 'is'} not in ${from}, such as ${quoted(extra[0])}.`
  return `${file} is missing ${plural(missing.length, 'line')} of ${from}.`
}

export const checks = {
  async join(t) {
    const name = 'mailing-list.txt holds both lists, market first'
    const file = 'mailing-list.txt'
    const got = saved(t, name, file)
    if (got.failed)
      return [
        noted(got.failed, changedNote(t, 'mailing/market-signups.txt', 'mailing/shop-signups.txt'))
      ]
    const { lines } = got
    const output = preview(file, lines)
    const market = starterLines(t, 'mailing/market-signups.txt')
    const shop = starterLines(t, 'mailing/shop-signups.txt')
    if (same(lines, [...market, ...shop])) return [check(name, true, '', output)]
    let message
    if (same(lines, [...shop, ...market])) {
      message =
        'Both lists are there, but the shop list comes first. Idris wants the market list first.'
    } else if (same(lines, shop)) {
      message =
        'mailing-list.txt holds only the shop list. If you saved each list with its own >, the second one replaced the first.'
    } else if (same(lines, market)) {
      message =
        'mailing-list.txt holds only the market list. The shop list goes under it, in the same file.'
    } else {
      message = diffMessage(file, lines, [...market, ...shop], 'the two lists')
    }
    const note = changedNote(t, 'mailing/market-signups.txt', 'mailing/shop-signups.txt')
    return [check(name, false, message + note, output)]
  },

  async first(t) {
    const name = 'first-orders.txt is the header and the first ten orders'
    const file = 'first-orders.txt'
    const rel = 'sales/web-orders.csv'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, changedNote(t, rel))]
    const { lines } = got
    const output = preview(file, lines, 12)
    const all = starterLines(t, rel)
    if (same(lines, all.slice(0, 11))) return [check(name, true, '', output)]
    let message
    if (startsWith(all, lines)) {
      message =
        lines.length === 1
          ? 'first-orders.txt has only the header line. The ten orders under it go in too.'
          : `first-orders.txt has the header and ${plural(lines.length - 1, 'order')}. The accountant wants ten orders under the header.`
    } else if (endsWith(all, lines)) {
      message = `These are the last lines of ${rel}, from the end of March. The accountant wants the start of the file.`
    } else if (lines[0] !== all[0]) {
      message = `first-orders.txt does not start with the header line of ${rel}, the line that names the columns.`
    } else {
      message = `These are not the first lines of ${rel}. ${diffMessage(file, lines, all.slice(0, 11), 'the start of the file')}`
    }
    return [check(name, false, message + changedNote(t, rel), output)]
  },

  async last(t) {
    const name = 'last-entries.txt is the last 8 entries of the March log'
    const file = 'last-entries.txt'
    const rel = 'logs/press-mar.log'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, changedNote(t, rel))]
    const { lines } = got
    const output = preview(file, lines, 12)
    const all = starterLines(t, rel)
    if (same(lines, all.slice(-8))) return [check(name, true, '', output)]
    let message
    const other = ['logs/press-jan.log', 'logs/press-feb.log'].find((r) =>
      endsWith(starterLines(t, r), lines)
    )
    if (endsWith(all, lines)) {
      message = `last-entries.txt has the last ${plural(lines.length, 'entry', 'entries')}. Hesper wants the last 8.`
    } else if (other) {
      message = `These are the last entries of ${other}. Hesper wants the March log.`
    } else if (startsWith(all, lines)) {
      message =
        'These are the first entries of the March log, from the start of the month. The newest entries are at the bottom.'
    } else {
      message = `These are not the last lines of ${rel}. ${diffMessage(file, lines, all.slice(-8), 'the end of the log')}`
    }
    return [check(name, false, message + changedNote(t, rel), output)]
  },

  async counts(t) {
    const name = 'entry-counts.txt counts the lines of every log'
    const file = 'entry-counts.txt'
    const got = saved(t, name, file)
    if (got.failed) return [got.failed]
    const { lines } = got
    const output = `${file}:\n${lines.join('\n')}`
    const logs = names(t.chapterPath('starter/logs'))
      .filter((n) => n.endsWith('.log'))
      .sort()
    const fail = (message) => [check(name, false, message, output)]
    const counted = new Map()
    for (const line of lines) {
      const m = line.match(/^(\d+)\s+(\S.*)$/)
      if (!m)
        return fail(
          `${quoted(line)} is not a count and a file name. Save only what the counting command prints.`
        )
      if (/^\d+\s/.test(m[2])) {
        return fail(
          'Each line has more than one number. Check wants only the number of lines of each log.'
        )
      }
      if (m[2] !== 'total') counted.set(m[2].split('/').pop(), Number(m[1]))
    }
    const extra = [...counted.keys()].filter((n) => !logs.includes(n))
    if (extra.length)
      return fail(
        `entry-counts.txt also counts ${extra.join(', ')}, which ${extra.length > 1 ? 'are not logs' : 'is not a log'}. Count only the .log files.`
      )
    const absent = logs.filter((n) => !counted.has(n))
    if (absent.length) {
      return fail(
        counted.size === 1
          ? `entry-counts.txt counts only ${[...counted.keys()][0]}. Count every log in one command: a second > replaces what the first saved.`
          : `entry-counts.txt has no count for ${absent.join(', ')}.`
      )
    }
    const text = (n) => read(t.chapterPath(`starter/logs/${n}`))
    const lineCount = (n) => text(n).split('\n').length - 1
    const wrong = logs.filter((n) => counted.get(n) !== lineCount(n))
    if (!wrong.length) return [check(name, true, '', output)]
    const words = (n) => text(n).split(/\s+/).filter(Boolean).length
    let message
    if (wrong.every((n) => counted.get(n) === words(n))) {
      message =
        'These are the numbers of words in each log. Each entry is one line, so count lines.'
    } else if (wrong.every((n) => counted.get(n) === Buffer.byteLength(text(n)))) {
      message = 'These are the sizes of the logs in bytes. Each entry is one line, so count lines.'
    } else {
      message = `The count for ${wrong[0]} is not its number of lines.`
    }
    const note = changedNote(t, ...wrong.map((n) => `logs/${n}`))
    return fail(message + note)
  }
}
