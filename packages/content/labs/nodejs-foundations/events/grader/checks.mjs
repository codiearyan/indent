import { isDeepStrictEqual } from 'node:util'
import { box, broken, errorLine, fail, hasStack, hide, lines, pass, report, run, uncaught } from '../../grading.mjs'

// Feeds the learner's Meter the lines in a JSON file and prints, as JSON, every event it emitted,
// in order, with a 'feed' entry before each line. With 'quiet', nothing listens for 'error'.
const DRIVER = `import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { Meter } from '../meter.js'
const [file, limit, mode] = process.argv.slice(2)
const meter = new Meter(Number(limit))
if (!(meter instanceof EventEmitter)) {
  console.log(JSON.stringify('not an emitter'))
  process.exit()
}
const events = []
const plain = (r) => (r && typeof r === 'object' ? { ...r } : { notAnObject: r === undefined ? '(nothing)' : r })
meter.on('reading', (r, ...more) => events.push(['reading', plain(r), more.length]))
meter.on('leak', (r, ...more) => events.push(['leak', plain(r), more.length]))
if (mode !== 'quiet') {
  meter.on('error', (e) => events.push(['error', e instanceof Error ? { message: e.message } : { notAnError: String(e) }]))
}
for (const line of JSON.parse(readFileSync(file, 'utf8'))) {
  events.push(['feed', line])
  meter.feed(line)
}
console.log(JSON.stringify(events))
`

// Stands in for meter.js so watch.js is judged on its own. It emits what the task's Meter emits
// and, as the script ends, reports on standard error what watch.js asked of it.
const STUB = `import { EventEmitter } from 'node:events'
const seen = { limit: null, feeds: 0, listeners: null, leakBefore: null, leakAfter: null }
process.on('exit', () => process.stderr.write('\\u0000meter ' + JSON.stringify(seen) + '\\n'))
export class Meter extends EventEmitter {
  constructor(limit) {
    super()
    this.limit = limit
    seen.limit = limit
  }
  feed(line) {
    seen.feeds++
    if (seen.listeners === null) {
      seen.listeners = { reading: this.listenerCount('reading'), leak: this.listenerCount('leak'), error: this.listenerCount('error') }
    }
    if (typeof line !== 'string' || line.trim() === '' || line.startsWith('#')) return
    const parts = line.split(',')
    const litres = Number(parts[2])
    if (parts.length !== 3 || parts[2].trim() === '' || !Number.isFinite(litres)) {
      this.emit('error', new Error('Not a reading: ' + line))
      return
    }
    const reading = { time: parts[0], tap: parts[1], litres }
    this.emit('reading', reading)
    if (litres > this.limit) {
      const first = seen.leakBefore === null
      if (first) seen.leakBefore = this.listenerCount('leak')
      this.emit('leak', reading)
      if (first) seen.leakAfter = this.listenerCount('leak')
    }
  }
}
`

/** What the task's Meter emits for these lines, in the driver's shape. */
function expected(feedLines, limit, { errors = true } = {}) {
  const events = []
  for (const line of feedLines) {
    events.push(['feed', line])
    if (line.trim() === '' || line.startsWith('#')) continue
    const parts = line.split(',')
    const litres = Number(parts[2])
    if (parts.length !== 3 || parts[2].trim() === '' || !Number.isFinite(litres)) {
      if (errors) events.push(['error', { message: line }])
      continue
    }
    const reading = { time: parts[0], tap: parts[1], litres }
    events.push(['reading', reading, 0])
    if (litres > limit) events.push(['leak', reading, 0])
  }
  return events
}

const READINGS = [
  '2031-04-02T10:00,east,3',
  '',
  '2031-04-02T10:00,west,0',
  '# restarted 2031-04-02T10:01',
  '2031-04-02T10:02,east,17',
  '2031-04-02T10:02,west,40'
]
const BAD = [
  '2031-04-02T10:00,east,3',
  '2031-04-02T10:0',
  '2031-04-02T10:05,east,lots',
  '2031-04-02T10:06,west,',
  '2031-04-02T10:07,west,9'
]

async function drive(t, feedLines, limit, mode = 'listen') {
  const dir = await box(t, { '.check/drive.mjs': DRIVER, '.check/lines.json': JSON.stringify(feedLines) })
  const r = await run(dir, '.check/drive.mjs', ['.check/lines.json', String(limit), mode])
  let events
  try {
    events = JSON.parse(lines(r.stdout).at(-1) ?? '')
  } catch {
    events = undefined
  }
  return { dir, r, events }
}

const fed = (feedLines, limit) =>
  `Check made a Meter with new Meter(${limit}), listened for its events, and fed it these lines:\n${feedLines.map((l) => `  ${l === '' ? '(a blank line)' : l}`).join('\n')}`

const describe = (events) =>
  Array.isArray(events)
    ? events.map(([name, value]) => (name === 'feed' ? `fed: ${value === '' ? '(a blank line)' : value}` : `  ${name} event: ${JSON.stringify(value)}`)).join('\n')
    : '(nothing came back)'

/** The detail for a driver run that went wrong before any event could be judged, or null. */
async function driverTrouble(name, d) {
  const found = await broken(name, d.r, d.dir, 'meter.js')
  if (found) return found
  if (/does not provide an export named 'Meter'/.test(d.r.stderr)) {
    return fail(name, 'meter.js has no export called Meter. Put export in front of the class, and call it Meter.', report(d.r))
  }
  if (d.events === 'not an emitter') {
    return fail(name, 'A Meter is not an EventEmitter. Make the class extend EventEmitter from node:events, so it has on and emit.', report(d.r))
  }
  if (/Class constructor|must call super|Must call super/.test(d.r.stderr)) {
    return fail(name, `Making a Meter failed: ${errorLine(d.r.stderr) ?? 'see the output'}. A class that extends another calls super() first in its constructor.`, report(d.r))
  }
  if (hasStack(d.r.stderr) && d.events === undefined) {
    return fail(name, `Feeding the Meter stopped with an error: ${errorLine(d.r.stderr) ?? 'see the output'}.`, report(d.r))
  }
  return null
}

/** Compares the events, the first difference in words. */
function eventTrouble(got, want, limit) {
  if (!Array.isArray(got)) return 'Nothing came back from feeding the Meter.'
  for (let i = 0; i < Math.max(got.length, want.length); i++) {
    const g = got[i]
    const w = want[i]
    if (isDeepStrictEqual(g, w)) continue
    const line = [...(g === undefined ? want : got).slice(0, i + 1)].reverse().find((e) => e[0] === 'feed')?.[1]
    const at = line === undefined ? '' : line === '' ? ' After a blank line,' : ` After the line ${line},`
    if (g === undefined) return `${at} the Meter emitted no ${w[0]} event, and one was expected.`.trim()
    if (w === undefined || w[0] === 'feed' && g[0] !== 'feed') {
      if (g[0] === 'reading' && (line === '' || line?.startsWith('#'))) return `${at} the Meter emitted a reading. Blank lines and notes are not readings.`.trim()
      if (g[0] === 'leak') return `${at} the Meter emitted a leak, but the reading is not more than the limit of ${limit}.`.trim()
      if (g[0] === 'reading') return `${at} the Meter emitted a reading for a line that is not one.`.trim()
      if (g[0] === 'error' && (line === '' || line?.startsWith('#'))) return `${at} the Meter emitted an error. Blank lines and notes are not mistakes: skip them without an event.`.trim()
      if (g[0] === 'error') return `${at} the Meter emitted an error, but the line is a reading.`.trim()
      return `${at} the Meter emitted ${g[0]}, which was not expected there.`.trim()
    }
    if (w[0] === 'error') {
      if (g[0] === 'reading') return `${at} the Meter emitted a reading for a line that is not one. Emit an error instead.`.trim()
      if (g[0] !== 'error') return `${at} the Meter emitted no error event for a line that is not a reading.`.trim()
      if (g[1].notAnError !== undefined) return `${at} the error event carried ${JSON.stringify(g[1].notAnError)}, not an Error object. Emit new Error(...) so a listener gets a message and Node can show where it came from.`.trim()
      if (!g[1].message.includes(w[1].message)) return `${at} the error's message does not include the line. Put the line in the message, so a person can find it in the log.`.trim()
      continue
    }
    if (g[0] !== w[0]) {
      if (g[0] === 'leak' && w[0] === 'reading') return `${at} the Meter emitted leak before reading. Emit reading first, then leak.`.trim()
      if (w[0] === 'leak') return `${at} the Meter emitted no leak event. The reading is more than the limit of ${limit}.`.trim()
      if (w[0] === 'reading') return `${at} the Meter emitted no reading event.`.trim()
      return `${at} the Meter emitted ${g[0]} where ${w[0]} was expected.`.trim()
    }
    const [, value, more] = g
    if (value.notAnObject !== undefined) return `${at} the ${w[0]} event carried ${JSON.stringify(value.notAnObject)}. Emit one object with time, tap and litres.`.trim()
    if (more > 0) return `${at} the ${w[0]} event carried more than one value. Emit one object with time, tap and litres.`.trim()
    if (typeof value.litres === 'string') return `${at} litres is text in the event. Turn it into a number.`.trim()
    const want3 = w[1]
    const picked = { time: value.time, tap: value.tap, litres: value.litres }
    if (isDeepStrictEqual(picked, want3)) continue
    return `${at} the ${w[0]} event's object should have time, tap and litres, taken from the line in that order.`.trim()
  }
  return null
}

async function judgeDriver(t, name, feedLines, limit) {
  const d = await drive(t, feedLines, limit)
  const early = await driverTrouble(name, d)
  if (early) return early
  const output = `${fed(feedLines, limit)}\n\nWhat happened:\n${describe(d.events)}\n\n${report(d.r)}`
  const message = hasStack(d.r.stderr)
    ? `Feeding the Meter stopped with an error: ${errorLine(d.r.stderr) ?? 'see the output'}.`
    : eventTrouble(d.events, expected(feedLines, limit), limit)
  return message ? fail(name, message, output) : pass(name, output)
}

const markerOf = (stderr) => {
  const line = stderr.split('\n').find((l) => l.startsWith('\u0000meter '))
  return line ? JSON.parse(line.slice(7)) : null
}
const withoutMarker = (r) => ({ ...r, stderr: r.stderr.split('\n').filter((l) => !l.startsWith('\u0000meter ')).join('\n') })

const LOG = [
  '2031-07-09T15:00,east,6',
  '2031-07-09T15:00,west,23',
  '2031-07-09T15:01,east,2',
  '',
  '2031-07-09T15:01,west,45',
  '2031-07-0',
  '# restarted 2031-07-09T15:03',
  '2031-07-09T15:03,east,21',
  '2031-07-09T15:03,west,20',
  '2031-07-09T15:04,east,1;2'
]
const QUIET_LOG = ['2031-08-01T06:00,east,0', '2031-08-01T06:00,west,5', '2031-08-01T06:01,east,20', '2031-08-01T06:01,west,0']

export const checks = {
  async reading(t) {
    return [
      await judgeDriver(t, 'Each reading line becomes a reading event with time, tap and litres', READINGS, 1000000)
    ]
  },

  async leak(t) {
    const one = await judgeDriver(t, 'With new Meter(15), a reading over 15 litres is also a leak', READINGS, 15)
    if (!one.passed) return [one]
    return [one, await judgeDriver(t, 'With new Meter(40), only a reading over 40 litres is a leak', READINGS, 40)]
  },

  async error(t) {
    const results = [await judgeDriver(t, 'A line that is not a reading becomes an error event, and the next line still counts', BAD, 1000000)]
    if (!results[0].passed) return results
    const name = 'With nothing listening for error, the error stops the script, as Node does'
    const d = await drive(t, BAD.slice(0, 2), 1000000, 'quiet')
    const early = await driverTrouble(name, d)
    if (early && !uncaught(d.r.stderr)) return [...results, early]
    const output = `${fed(BAD.slice(0, 2), 1000000)}\nNothing listened for error.\n\n${report(d.r)}`
    let message = null
    if (!uncaught(d.r.stderr)) {
      message = 'With nothing listening for error, the Meter carried on as if all was well. Emit the error event even when nobody listens: Node then stops the script, which is the point.'
    } else if (!d.r.stderr.includes(BAD[1])) {
      message = 'With nothing listening, the script stopped, but what Node printed does not include the line. Put the line in the error\'s message.'
    }
    results.push(message ? fail(name, message, output) : pass(name, output))
    return results
  },

  async watch(t) {
    const results = []
    const dir = await box(t, { 'meter.js': STUB, 'logs/july.txt': LOG.join('\r\n') + '\r\n', 'logs/august.txt': QUIET_LOG.join('\n') + '\n' })
    const busy = await run(dir, 'watch.js', ['logs/july.txt'])
    const quiet = await run(dir, 'watch.js', ['logs/august.txt'])
    for (const r of [busy, quiet]) {
      const found = await broken('watch.js watches a log', withoutMarker(r), dir, 'watch.js')
      if (found) return [found]
    }
    const note = 'Check put a stand-in meter.js of its own beside watch.js, so this task is judged on its own. It emits what the Meter of tasks 1 to 3 emits.'
    const judge = (r, wanted, bad) => {
      const seen = markerOf(r.stderr)
      const clean = withoutMarker(r)
      const out = lines(clean.stdout).map((l) => l.trim())
      const err = lines(clean.stderr).filter((l) => l.trim() !== '')
      if (seen === null || seen.limit === null) {
        return 'watch.js did not make a Meter from meter.js. Import Meter from ./meter.js and make one with the limit from the task.'
      }
      if (seen.feeds === 0) return 'watch.js made a Meter but never fed it a line. Feed it each line of the log as it is read.'
      if (seen.limit !== 20) return `watch.js made its Meter with a limit of ${JSON.stringify(seen.limit)}. A leak is more than 20 litres in a minute.`
      if (uncaught(clean.stderr) && /Not a reading/.test(clean.stderr)) {
        return 'watch.js stopped at a line that is not a reading: the Meter emitted an error event and nothing was listening for it. Listen for error and print one line for each.'
      }
      if (hasStack(clean.stderr)) return `watch.js stopped with an error: ${errorLine(clean.stderr) ?? 'see the output'}.`
      if (seen.listeners && seen.listeners.reading === 0) {
        return 'watch.js did not listen for reading events. Count the readings with a listener, so the Meter decides what a reading is.'
      }
      const alarms = out.filter((l) => l.startsWith('ALARM'))
      if (wanted.alarm && alarms.length === 0) return 'At the first leak, no ALARM line was printed. Listen for leak.'
      if (alarms.length > 1) return `The alarm rang ${alarms.length} times. It rings at the first leak only: after that, remove its listener.`
      if (wanted.alarm && alarms[0] !== wanted.alarm) return 'The ALARM line is not right. Compare it with the task: the tap and the time of the first leak.'
      if (wanted.alarm && seen.leakBefore !== null && seen.leakAfter === seen.leakBefore) {
        return 'The alarm rang once, but its listener was still there after the first leak. Remove the alarm\'s listener with off once it has rung, or add it with once.'
      }
      if (!wanted.alarm && alarms.length > 0) return 'With no leak in the log, an ALARM line was printed.'
      const summary = out.filter((l) => !l.startsWith('ALARM'))
      if (summary.length === 0 && err.length > 0 && bad.length > 0) {
        return 'watch.js stopped at the first line it skipped, so the rest of the log was never read. Say so, set the exit code, and go on to the next line.'
      }
      if (summary.length !== 1 || summary[0] !== wanted.summary) {
        if (summary.length === 1 && /^Readings: \d+\. Leaks: \d+\.$/.test(summary[0])) {
          return `The counts are not right: ${summary[0]} Count a reading for each reading event, and a leak for each leak event, the first one included.`
        }
        return 'After the log, print one line with the counts, like the task\'s example, and nothing else on standard output but the alarm.'
      }
      if (err.length !== bad.length) {
        return bad.length === 0
          ? 'With every line a reading, something went to standard error.'
          : `The log has ${bad.length} lines that are not readings. Print one line on standard error for each.`
      }
      for (const [i, line] of bad.entries()) {
        if (!err[i].includes(line)) return 'Each line on standard error should include the error\'s message, which names the line.'
      }
      const code = bad.length > 0 ? 1 : 0
      if (r.code !== code) {
        return bad.length > 0
          ? `watch.js ended with exit code ${r.code}. When a line had to be skipped, it ends with exit code 1, after reading the whole log.`
          : `watch.js ended with exit code ${r.code}. With every line a reading, it ends with 0.`
      }
      return null
    }
    const n1 = 'A log with leaks and lines that are not readings'
    const m1 = judge(busy, { alarm: 'ALARM: leak on west at 2031-07-09T15:00', summary: 'Readings: 6. Leaks: 3.' }, ['2031-07-0', '2031-07-09T15:04,east,1;2'])
    const o1 = `${note}\n\n${hide(report(withoutMarker(busy)))}`
    results.push(m1 ? fail(n1, m1, o1) : pass(n1, o1))
    const n2 = 'A log with no leak and no bad line'
    const m2 = judge(quiet, { alarm: null, summary: 'Readings: 4. Leaks: 0.' }, [])
    const o2 = `${note}\n\n${hide(report(withoutMarker(quiet)))}`
    results.push(m2 ? fail(n2, m2, o2) : pass(n2, o2))
    return results
  }
}
