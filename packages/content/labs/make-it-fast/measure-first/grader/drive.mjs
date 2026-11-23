// Copied into the sandbox as .grader/drive.mjs. performance.now() reads the check's own clock,
// which moves only when the check's own steps do work, by an amount the check chose. So every
// time the learner's code measures is known in advance and the same on every run.
import { earlier, shown } from './helpers.mjs'

let clock = 0
performance.now = () => clock

const measure = await import('../src/measure.js')

// A step whose nth run moves the clock by costs[n] (the last cost repeats).
function step(costs, { later = false } = {}) {
  let runs = 0
  const cost = () => costs[Math.min(runs++, costs.length - 1)]
  const fn = later
    ? async () => {
        await null
        clock += cost()
      }
    : () => {
        clock += cost()
      }
  return { fn, runs: () => runs }
}

const middle = (times) => [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)]
const mean = (times) => times.reduce((sum, t) => sum + t, 0) / times.length

const TIME_CASES = {
  five: { costs: [100, 10, 21, 11, 13, 12], runs: 5 },
  default: { costs: [80, 30, 21, 25, 40, 22] },
  four: { costs: [60, 12, 21, 9, 40], runs: 4 },
  later: { costs: [50, 7, 9, 8], runs: 3, later: true }
}

export async function timeCase(name) {
  const c = TIME_CASES[name]
  const runs = c.runs ?? 5
  const s = step(c.costs, c)
  const got = await (c.runs === undefined ? measure.timeIt(s.fn) : measure.timeIt(s.fn, c.runs))
  const timed = c.costs.slice(1, runs + 1)
  const want = middle(timed)
  const seen = `it returned ${shown(got)}; the step ran ${s.runs()} times`
  if (got === want && s.runs() === runs + 1) return { ok: true, seen }
  const why =
    name === 'later' && got === 0
      ? 'await'
      : typeof got !== 'number' || Number.isNaN(got) || got < 1
      ? 'clock'
      : s.runs() === runs
        ? 'warm'
        : s.runs() !== runs + 1
          ? 'runs'
          : got === middle(c.costs.slice(0, runs))
            ? 'warm'
            : got === mean(timed)
              ? 'mean'
              : got === [...timed].sort()[Math.floor(runs / 2)]
                ? 'text'
                : got === Math.min(...timed)
                  ? 'fastest'
                  : 'middle'
  return { ok: false, seen, why }
}

async function timeItWorks() {
  const s = step([30, 4, 6, 5])
  const got = await measure.timeIt(s.fn, 3).catch((error) => error)
  if (got instanceof Error && /Not implemented/.test(got.message)) {
    earlier('This task needs task 1 first: timeIt still throws \'Not implemented\'.')
  }
  if (got !== 5 || s.runs() !== 4) earlier('This task needs task 1 first: timeIt does not give the middle time yet.')
}

const STEP_CASES = {
  three: { steps: { match: [70, 40, 44, 41, 39, 43], money: [130, 90, 95, 88, 91, 99], print: [20, 15, 17, 14, 16, 15] } },
  four: { runs: 3, steps: { load: [9, 5, 6, 4, 70], sort: [80, 50, 55, 52, 5], check: [40, 20, 26, 21, 90], save: [60, 35, 30, 33, 1] } }
}

export async function stepsCase(name) {
  await timeItWorks()
  const c = STEP_CASES[name]
  const runs = c.runs ?? 5
  const made = Object.fromEntries(Object.entries(c.steps).map(([key, costs]) => [key, step(costs)]))
  const steps = Object.fromEntries(Object.entries(made).map(([key, s]) => [key, s.fn]))
  const got = await (c.runs === undefined ? measure.timeSteps(steps) : measure.timeSteps(steps, c.runs))
  const want = Object.entries(c.steps)
    .map(([key, costs]) => ({ name: key, ms: middle(costs.slice(1, runs + 1)) }))
    .sort((a, b) => b.ms - a.ms)
  const seen = `it returned ${shown(got)}`
  if (!Array.isArray(got) || got.some((row) => typeof row?.name !== 'string' || typeof row.ms !== 'number')) {
    return { ok: false, seen, why: 'shape' }
  }
  const names = got.map((row) => row.name).join()
  const ok = names === want.map((row) => row.name).join() && got.every((row, i) => row.ms === want[i].ms)
  if (ok) return { ok, seen }
  const sameNames = [...got.map((row) => row.name)].sort().join() === Object.keys(c.steps).sort().join()
  if (!sameNames) return { ok: false, seen, why: 'names' }
  const costs = (key) => c.steps[key]
  const msOf = (key, n) => middle(Array.from({ length: n }, (_, i) => costs(key)[Math.min(i + 1, costs(key).length - 1)]))
  const timesRight = got.every((row) => row.ms === msOf(row.name, runs))
  if (timesRight) return { ok: false, seen, why: 'order' }
  if (got.every((row) => row.ms === msOf(row.name, 5))) return { ok: false, seen, why: 'runs' }
  return { ok: false, seen, why: got.some((row) => row.ms > Math.max(...costs(row.name))) ? 'together' : 'times' }
}

export function countCase(name) {
  const { counted } = measure
  if (name === 'sort') {
    let real = 0
    const compare = counted((a, b) => {
      real += 1
      return a - b
    })
    const before = compare.calls
    const list = [41, 7, 93, 18, 66, 2, 55, 30, 12, 80]
    list.sort(compare)
    const seen = `calls before sorting: ${shown(before)}, after: ${shown(compare.calls)}; the list came out ${shown(list)}`
    const sorted = list.every((n, i) => i === 0 || list[i - 1] <= n)
    if (before === 0 && compare.calls === real && sorted) return { ok: true, seen }
    return { ok: false, seen, why: !sorted ? 'result' : before !== 0 ? 'start' : 'count' }
  }
  if (name === 'args') {
    const mix = counted((a, b, c) => a + b * c)
    const answers = [mix(2, 3, 4), mix(10, 0, 9), mix(1, 1, 1)]
    const seen = `it returned ${shown(answers)}; calls: ${shown(mix.calls)}`
    if (answers.join() === '14,10,2' && mix.calls === 3) return { ok: true, seen }
    return { ok: false, seen, why: answers.join() === '14,10,2' ? 'count' : 'result' }
  }
  if (name === 'apart') {
    const a = counted(() => 'a')
    const b = counted(() => 'b')
    a()
    a()
    b()
    a()
    const seen = `the first counted ${shown(a.calls)}, the second ${shown(b.calls)}`
    if (a.calls === 3 && b.calls === 1) return { ok: true, seen }
    return { ok: false, seen, why: a.calls === 4 || b.calls === 4 ? 'apart' : 'count' }
  }
  if (name === 'same') {
    const order = { id: 'A1' }
    const give = counted(() => order)
    const back = give()
    const seen = back === order ? 'it returned the very object the function returned' : `it returned ${shown(back)}`
    if (back === order && give.calls === 1) return { ok: true, seen }
    return { ok: false, seen, why: back === order ? 'count' : 'result' }
  }
  if (name === 'throws') {
    let n = 0
    const shaky = counted(() => {
      n += 1
      if (n === 2) throw new Error('Price list is locked')
      return n
    })
    const tries = [1, 2, 3].map(() => {
      try {
        return shaky()
      } catch (error) {
        return error
      }
    })
    const threw = tries[1] instanceof Error && tries[1].message === 'Price list is locked'
    const seen = `the second call ${threw ? 'threw the error' : `gave ${shown(tries[1])}`}; calls: ${shown(shaky.calls)}`
    if (threw && shaky.calls === 3) return { ok: true, seen }
    return { ok: false, seen, why: threw ? 'count' : 'throws' }
  }
  throw new Error(`The check has no case named ${name}`)
}
