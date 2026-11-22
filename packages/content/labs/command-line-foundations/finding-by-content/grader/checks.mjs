import { isAbsolute, posix, relative, sep } from 'node:path'
import {
  changedNote,
  check,
  filesUnder,
  kind,
  lineDiff,
  linesOf,
  noted,
  preview,
  quoted,
  real,
  saved,
  starterLines
} from '../../grading.mjs'

const ORDERS = 'sales/web-orders.csv'
const LOG = 'logs/press-mar.log'
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const are = (n) => (n === 1 ? 'is' : 'are')

/** A message for lines that differ from the wanted ones, or null when they are the same. */
function differs(file, got, want) {
  const { missing, extra } = lineDiff(got, want)
  if (extra.length) {
    return `${file} has ${plural(extra.length, 'line')} the search should not find, such as ${quoted(extra[0])}.`
  }
  if (missing.length)
    return `${plural(missing.length, 'line')} ${are(missing.length)} missing from ${file}, such as ${quoted(missing[0])}.`
  return null
}

/** What went wrong when every line starts with a file name or a line number grep added. */
function prefixed(file, lines, want) {
  if (lines.every((l) => /^[^\s:]+:/.test(l)) && lines.some((l) => !want.includes(l))) {
    const stripped = lines.map((l) => l.replace(/^[^\s:]+:/, ''))
    if (lines.every((l) => /^\d+:/.test(l)) && !differs(file, stripped, want)) {
      return 'Each line starts with its line number. The task wants the lines as they are in the file.'
    }
    if (lines.every((l) => /^[^\s:]+\.(csv|log|txt):/.test(l))) {
      return 'Each line starts with a file name, which grep adds when it searches more than one file. Search only the one file the task names, and keep a phrase with a space in quotes.'
    }
  }
  return null
}

export const checks = {
  async pellow(t) {
    const name = 'pellow-bakery.txt has every Pellow Bakery order'
    const file = 'pellow-bakery.txt'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, changedNote(t, ORDERS))]
    const { lines } = got
    const output = preview(file, lines)
    const all = starterLines(t, ORDERS)
    const want = all.filter((l) => l.includes('Pellow Bakery'))
    const wrong = differs(file, lines, want)
    if (!wrong) return [check(name, true, '', output)]
    let message = prefixed(file, lines, want)
    if (!message && lines.some((l) => l.includes('Pellow Farm Shop'))) {
      message =
        "pellow-bakery.txt also has orders from Pellow Farm Shop, another customer. Search for the bakery's whole name."
    } else if (!message && lines.includes(all[0])) {
      message = 'pellow-bakery.txt also has the header line, which is not an order.'
    }
    return [check(name, false, (message ?? wrong) + changedNote(t, ORDERS), output)]
  },

  async jams(t) {
    const name = 'jams.txt has every line of the March log about a jam'
    const file = 'jams.txt'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, changedNote(t, LOG))]
    const { lines } = got
    const output = preview(file, lines)
    const want = starterLines(t, LOG).filter((l) => /jam/i.test(l))
    const wrong = differs(file, lines, want)
    if (!wrong) return [check(name, true, '', output)]
    let message = prefixed(file, lines, want)
    const { missing, extra } = lineDiff(lines, want)
    const small = lineDiff(
      lines,
      want.filter((l) => l.includes('jam'))
    )
    if (!message && !small.missing.length && !small.extra.length) {
      message = `${plural(missing.length, 'line')} ${are(missing.length)} missing, such as ${quoted(missing[0])}. ${missing.length === 1 ? 'It writes' : 'They write'} jam with capitals.`
    }
    return [check(name, false, (message ?? wrong) + changedNote(t, LOG), output)]
  },

  async unpaid(t) {
    const name = 'unpaid-count.txt holds the number of unpaid orders'
    const file = 'unpaid-count.txt'
    const got = saved(t, name, file)
    if (got.failed) return [noted(got.failed, changedNote(t, ORDERS))]
    const { lines } = got
    const output = preview(file, lines)
    const fail = (message) => [check(name, false, message, output)]
    const all = starterLines(t, ORDERS)
    if (lines.length > 1) {
      return fail(
        lines.some((l) => all.includes(l))
          ? 'unpaid-count.txt holds the order lines themselves. Check wants how many there are: one number.'
          : 'unpaid-count.txt has more than one line. Check wants one number.'
      )
    }
    const m = lines[0].match(/^(\d+)(\s+\S.*)?$/)
    if (!m)
      return fail('unpaid-count.txt should hold only the number, as the counting option prints it.')
    const n = Number(m[1])
    const want = all.filter((l) => l.includes('unpaid')).length
    if (n === want) return [check(name, true, '', output)]
    let message
    if (n === all.length) {
      message =
        'That is the number of lines in the whole file, the header included, not the unpaid orders.'
    } else if (n === all.length - 1) {
      message =
        'Every order was counted, the paid ones too. Look at how the word you searched for sits inside both statuses.'
    } else if (n === 0) {
      message =
        'Nothing was counted. Check the spelling and the capitals of the word you searched for.'
    } else {
      message = `That is not the number of unpaid orders in ${ORDERS}.`
    }
    return fail(message + changedNote(t, ORDERS))
  },

  async address(t) {
    const name = 'wrong-address.txt has every line about a wrong address'
    const file = 'wrong-address.txt'
    const got = saved(t, name, file)
    if (got.failed) return [got.failed]
    const { lines } = got
    const output = preview(file, lines)
    const fail = (message) => [check(name, false, message, output)]
    const top = real(t.workspace)
    const pathOf = (raw) => {
      const p =
        isAbsolute(raw) && top
          ? relative(top, real(raw) ?? raw)
              .split(sep)
              .join('/')
          : raw
      return posix.normalize(p)
    }
    const parsed = []
    for (const line of lines) {
      const m = line.match(/^(.+?):(\d+):(.*)$/)
      if (m) {
        parsed.push(`${pathOf(m[1])}:${m[2]}:${m[3].trim()}`)
        continue
      }
      if (/^[^\s:]+\.txt:/.test(line)) {
        return fail('The lines have a file name but no line number. The task wants both.')
      }
      return fail(`${quoted(line)} does not start with a file name and a line number.`)
    }
    const outside = parsed.find((l) => !l.startsWith('messages/'))
    if (outside && kind(t.workspace, 'messages', ...outside.split(':')[0].split('/')) === 'file') {
      return fail(
        `Paths such as ${outside.split(':')[0]} start inside messages, so they do not lead to the file from the top folder. Run the search from the top folder.`
      )
    }
    if (outside) {
      return fail(
        `wrong-address.txt also has a line from ${outside.split(':')[0]}, outside messages. Search only the messages folder.`
      )
    }
    const dir = t.chapterPath('starter')
    const want = filesUnder(dir, 'messages').flatMap((rel) =>
      linesOf(`${dir}/${rel}`).flatMap((l, i) =>
        l.includes('wrong address') ? [`${rel}:${i + 1}:${l}`] : []
      )
    )
    const { missing, extra } = lineDiff(parsed, want)
    if (!missing.length && !extra.length) return [check(name, true, '', output)]
    const folders = [...new Set(want.map((l) => l.split('/')[1]))]
    const searched = folders.filter((f) => parsed.some((l) => l.split('/')[1] === f))
    let message
    if (extra.some((l) => !l.includes('wrong address') && l.includes('wrong'))) {
      message = `Some lines have wrong but not wrong address, such as ${quoted(extra.find((l) => !l.includes('wrong address')))}. The search has to be for the whole phrase, kept together.`
    } else if (extra.length) {
      message = `wrong-address.txt has ${plural(extra.length, 'line')} that ${are(extra.length) === 'is' ? 'does' : 'do'} not match a line about a wrong address, such as ${quoted(extra[0])}. Check the file names and line numbers.`
    } else if (searched.length < folders.length) {
      message = `Nothing from messages/${folders.filter((f) => !searched.includes(f)).join(' or messages/')} is there. The search has to go into every folder inside messages.`
    } else {
      message = `${plural(missing.length, 'line')} ${are(missing.length)} missing, such as ${quoted(missing[0])}.`
    }
    const changed = filesUnder(dir, 'messages').filter((rel) => changedNote(t, rel))
    return fail(message + (changed.length ? changedNote(t, changed[0]) : ''))
  }
}
