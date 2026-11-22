import { box, broken, errorLine, fail, hasStack, lines, outOfMemory, pass, report, run } from '../../grading.mjs'

// The script gets 16 MB for its data and a log of about 24 MB. Holding the whole log, as one text
// or as an array of its lines, cannot fit, so it runs out of memory every time; reading a line at a
// time and keeping only totals needs far less. Nothing here measures time.
const MEMORY = 16
const BIG = 'logs/year-2031.txt'
const SMALL = 'logs/feb-2031.txt'

let made
/** The big log and what it holds, made once per Check and the same every time. */
function bigLog() {
  made ??= (() => {
    let seed = 31
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    const parts = []
    const taps = { north: 0, south: 0, east: 0 }
    let size = 0
    let count = 0
    let total = 0
    let notes = 0
    for (let minute = 0; size < 24_000_000; minute++) {
      if (minute % 100_000 === 50_000) {
        const note = `# restarted at minute ${minute}\n`
        parts.push(note)
        size += note.length
        notes++
      }
      const time = `2031-${String(1 + Math.floor(minute / 43200)).padStart(2, '0')}-m${minute}`
      for (const tap of ['north', 'south', 'east']) {
        const litres = random() < 0.1 ? 1 + Math.floor(random() * 14) : 0
        const line = `${time},${tap},${litres}\n`
        parts.push(line)
        size += line.length
        count++
        total += litres
        taps[tap] += litres
      }
    }
    return { text: parts.join(''), count, total, taps, notes }
  })()
  return made
}

const SMALL_TEXT =
  '2031-02-01T09:00,north,5\r\n2031-02-01T09:00,east,0\r\n\r\n# restarted 2031-02-01T09:02\r\n' +
  '2031-02-01T09:03,north,11\r\n2031-02-01T09:03,east,8\r\n\r\n2031-02-01T09:04,east,3\r\n2031-02-01T09:04,north,2'
const SMALL_LOG = { count: 6, notes: 1, blanks: 2, total: 29, taps: { east: 11, north: 18 } }

async function logs(t) {
  return box(t, { [BIG]: bigLog().text, [SMALL]: SMALL_TEXT })
}

// A tight memory makes a slow computer slower still, so these runs get longer before Check stops one.
const SECONDS = 20
const both = (dir, script) =>
  Promise.all([run(dir, script, [BIG], { memory: MEMORY, seconds: SECONDS }), run(dir, script, [SMALL], { memory: MEMORY, seconds: SECONDS })])

/** The detail for a run that went wrong the same way in every task, or null. */
function common(r, script, which) {
  if (outOfMemory(r.stderr)) {
    return `${script} ran out of the ${MEMORY} MB Check gave it, on a log of about 24 MB. It held the whole log at once, as one text or as a list of its lines. Read it a line at a time, and keep only what you need from each line.`
  }
  if (/ENOENT/.test(r.stderr)) {
    return `${script} could not find the log it was given: ${errorLine(r.stderr) ?? 'see the output'}. Open the file named after the script's name, as it was typed.`
  }
  if (hasStack(r.stderr)) return `On the ${which} log, ${script} stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
  if (r.code !== 0) return `On the ${which} log, ${script} ended with exit code ${r.code}. A log that was read through ends with 0.`
  return null
}

async function start(t, script) {
  const dir = await logs(t)
  const [big, small] = await both(dir, script)
  for (const r of [big, small]) {
    const found = await broken(`${script} reads a log`, r, dir, script)
    if (found) return { early: [found] }
  }
  return { big, small }
}

const BIG_NAME = 'A log bigger than the memory the script has is read a line at a time'
const SMALL_NAME = 'A short log saved on Windows, with blank lines and a restart note'

export const checks = {
  async count(t) {
    const { early, big, small } = await start(t, 'count-readings.js')
    if (early) return early
    const sameAnswer = big.stdout === small.stdout
    const judge = (r, log, which) => {
      const trouble = common(r, 'count-readings.js', which)
      if (trouble) return trouble
      const got = lines(r.stdout).map((l) => l.trim())
      if (got.length === 1 && got[0] === `${log.count} readings`) return null
      const number = Number(/^(\d+)/.exec(got[0] ?? '')?.[1])
      if (got.length !== 1) return `On the ${which} log, print one line, like the task's example.`
      if ([8, 1051200].includes(number) && sameAnswer) {
        return `The count is the one for a log from the starter, not for the log Check named. Open the file named after the script's name.`
      }
      if (log.blanks && number === log.count + log.notes + log.blanks) {
        return `On the ${which} log, the restart note and the blank lines were counted as readings. Leave out blank lines, and lines that start with #: those are notes from the logger.`
      }
      if (number === log.count + log.notes) {
        return `On the ${which} log, the restart note was counted as a reading. A line that starts with # is a note from the logger, not a reading.`
      }
      if (number === log.count + (log.blanks ?? 0)) return `On the ${which} log, blank lines were counted as readings. Leave them out.`
      if (number === log.count) return `On the ${which} log, the count is right but the line is not: write it like the task's example.`
      return `On the ${which} log, the count is not right. Count every line that is a reading, and only those.`
    }
    const m1 = judge(big, bigLog(), 'big')
    const m2 = judge(small, SMALL_LOG, 'short')
    return [
      m1 ? fail(BIG_NAME, m1, report(big)) : pass(BIG_NAME, report(big)),
      m2 ? fail(SMALL_NAME, m2, report(small)) : pass(SMALL_NAME, report(small))
    ]
  },

  async total(t) {
    const { early, big, small } = await start(t, 'water-year.js')
    if (early) return early
    const judge = (r, log, which) => {
      const trouble = common(r, 'water-year.js', which)
      if (trouble) return trouble
      const got = lines(r.stdout).map((l) => l.trim())
      if (got.length === 1 && got[0] === `Total: ${log.total} litres`) return null
      if (got.length !== 1) return `On the ${which} log, print one line, like the task's example.`
      if (/NaN/.test(got[0])) return `On the ${which} log, the total came out as NaN. A line that is not a reading, like a blank line or a note, was added in.`
      if (/Total: 0\d/.test(got[0])) return `On the ${which} log, the litres were joined as text instead of added. Turn each one into a number first.`
      const number = Number(/(\d+)/.exec(got[0])?.[1])
      if (number === 35 || number === 318011) return `The total is the one for a log from the starter, not for the log Check named.`
      if (number === log.total) return `On the ${which} log, the total is right but the line is not: write it like the task's example.`
      return `On the ${which} log, the total is not right. Add the last part of every reading, the litres, and nothing else.`
    }
    const m2 = judge(small, SMALL_LOG, 'short')
    // Text that grows by every litre can outgrow the memory too; the short log names that cause.
    const m1 = outOfMemory(big.stderr) && /joined as text/.test(m2 ?? '') ? m2.replace('short', 'big') : judge(big, bigLog(), 'big')
    return [
      m1 ? fail(BIG_NAME, m1, report(big)) : pass(BIG_NAME, report(big)),
      m2 ? fail(SMALL_NAME, m2, report(small)) : pass(SMALL_NAME, report(small))
    ]
  },

  async taps(t) {
    const { early, big, small } = await start(t, 'tap-totals.js')
    if (early) return early
    const judge = (r, log, which) => {
      const trouble = common(r, 'tap-totals.js', which)
      if (trouble) return trouble
      const got = lines(r.stdout).map((l) => l.trim())
      const names = Object.keys(log.taps).sort()
      const wanted = names.map((tap) => `${tap}: ${log.taps[tap]} litres`)
      if (got.join('\n') === wanted.join('\n')) return null
      if ([...got].sort().join('\n') === wanted.join('\n')) {
        return `On the ${which} log, every tap's total is right, but the taps are not in the order of their names.`
      }
      if (got.some((l) => /^undefined:/.test(l))) return `On the ${which} log, a tap is called undefined: a line that is not a reading, like a note, was added in as one.`
      if (got.some((l) => /: undefined/.test(l))) return `On the ${which} log, a tap that is not in it was printed, with undefined for its total. Print the taps the log holds, whatever their names.`
      if (got.some((l) => /NaN/.test(l))) return `On the ${which} log, a total came out as NaN. The first time a tap turns up it has no total yet, so start it from 0.`
      if (got.some((l) => /: 0\d/.test(l))) return `On the ${which} log, the litres were joined as text instead of added. Turn each one into a number first.`
      if (got.length !== names.length) return `On the ${which} log, print one line for each tap in the log, ${names.length} here, and no other lines.`
      return `On the ${which} log, a tap's total is not right. Each reading's litres go to the total of its own tap.`
    }
    const m1 = judge(big, bigLog(), 'big')
    const m2 = judge(small, SMALL_LOG, 'short')
    return [
      m1 ? fail(BIG_NAME, m1, report(big)) : pass(BIG_NAME, report(big)),
      m2 ? fail(SMALL_NAME, m2, report(small)) : pass(SMALL_NAME, report(small))
    ]
  }
}
