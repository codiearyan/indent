// Copied into the sandbox as .grader/drive.mjs. The service is the check's own and has no real
// delay: a question stays open until the check answers it. The check lets the learner's code ask
// all it wants, notes how many questions are open, then answers the newest one, and so on, so the
// answers come back out of order. The record is the same on every run.
import { many, same, shown } from './helpers.mjs'
import * as reference from './reference.mjs'

const together = await import('../src/together.js')
const report = await import('../src/report.js')

const turn = () => new Promise((resolve) => setImmediate(resolve))
const pause = () => new Promise((resolve) => setTimeout(resolve, 5))

function service(answerFor) {
  const s = { pending: [], open: 0, most: 0, asked: [] }
  s.ask = (id) => {
    s.asked.push(id)
    s.open += 1
    s.most = Math.max(s.most, s.open)
    return new Promise((resolve) => {
      s.pending.push({
        id,
        answer: () => {
          s.open -= 1
          resolve(answerFor(id))
        }
      })
    })
  }
  return s
}

// Runs `work`, records how many questions were open before the first answer, then answers the
// newest open question one at a time until the work is done or nothing more happens.
async function drive(s, work) {
  let done = false
  let value
  let error
  Promise.resolve()
    .then(work)
    .then(
      (v) => {
        done = true
        value = v
      },
      (e) => {
        done = true
        error = e
      }
    )
  let seen = -1
  for (let i = 0; i < 20 && seen !== s.asked.length; i++) {
    seen = s.asked.length
    await turn()
    await turn()
  }
  const firstWave = s.open
  let idle = 0
  while (!done && idle < 40) {
    if (s.pending.length === 0) {
      idle += 1
      await pause()
      continue
    }
    idle = 0
    s.pending.pop().answer()
    await turn()
    await turn()
  }
  for (let i = 0; i < 10 && !done; i++) await turn()
  if (error instanceof Error && /Not implemented/.test(error.message)) throw error
  return { done, value, error, firstWave }
}

const answerFor = (id) => `answer for ${id}`
const idsOf = (count) => Array.from({ length: count }, (_, i) => `A${700003 + i * 7}`)

function judge(s, r, ids, { open }) {
  const lines = [
    `questions open before the first answer: ${r.firstWave}`,
    `most open at once: ${s.most}`,
    `questions asked: ${many(s.asked.length)} for ${many(ids.length)} ids`
  ]
  if (r.error) return { ok: false, seen: `${lines.join('\n')}\nit failed: ${shown(r.error)}`, why: 'threw' }
  if (!r.done) {
    const said = s.asked.length ? 'it never finished, though every question was answered' : 'it never asked anything and never finished'
    return { ok: false, seen: `${lines.join('\n')}\n${said}`, why: s.asked.length ? 'stuck' : 'silent' }
  }
  lines.push(`it returned ${shown(r.value)}`)
  const seen = lines.join('\n')
  const each = s.asked.length === ids.length && new Set(s.asked).size === ids.length && s.asked.every((id) => ids.includes(id))
  if (!each) return { ok: false, seen, why: 'each' }
  if (s.most > open) return { ok: false, seen, why: 'over' }
  if (r.firstWave < Math.min(open, ids.length)) return { ok: false, seen, why: r.firstWave <= 1 ? 'one' : 'fewer' }
  const want = ids.map(answerFor)
  if (!Array.isArray(r.value) || r.value.length !== want.length || r.value.some((v, i) => v !== want[i])) {
    const sameSet = Array.isArray(r.value) && [...r.value].sort().join() === [...want].sort().join()
    const early = Array.isArray(r.value) && (r.value.length < want.length || r.value.includes(undefined))
    return { ok: false, seen, why: sameSet ? 'order' : early ? 'early' : 'answers' }
  }
  return { ok: true, seen }
}

export async function allCase(count) {
  const ids = idsOf(count)
  const s = service(answerFor)
  const r = await drive(s, () => together.askAll(ids, s.ask))
  return judge(s, r, ids, { open: ids.length })
}

export async function limitCase(count, limit) {
  const ids = idsOf(count)
  const s = service(answerFor)
  const r = await drive(s, () => together.askLimited(ids, s.ask, limit))
  return judge(s, r, ids, { open: limit })
}

// Trade orders of the check's own: some already marked paid, the rest not.
function tradeOf(count, unpaidEvery) {
  return Array.from({ length: count }, (_, i) => ({
    id: `A${810001 + i * 11}`,
    customerId: `C${30011 + (i % 7) * 13}`,
    item: 'invite',
    qty: 10 + i,
    day: '2026-10-02',
    paid: unpaidEvery === 0 || i % unpaidEvery !== 1,
    customer: { id: `C${30011 + (i % 7) * 13}`, name: 'Holm Weddings', trade: true }
  }))
}

const statusFor = (trade) => {
  const byId = new Map(trade.map((o, i) => [o.id, o.paid ? 'paid' : i % 3 === 0 ? 'late' : 'due']))
  return (id) => byId.get(id) ?? 'unknown'
}

async function askLimitedWorks() {
  const ids = idsOf(6)
  const s = service(answerFor)
  const r = await drive(s, () => together.askLimited(ids, s.ask, 2))
  return judge(s, r, ids, { open: 2 }).ok
}

export async function paymentsCase(count, unpaidEvery) {
  const trade = tradeOf(count, unpaidEvery)
  const status = statusFor(trade)
  const want = await reference.checkPayments(trade, async (id) => status(id))
  const unpaid = trade.filter((o) => !o.paid).map((o) => o.id)
  const s = service(status)
  const r = await drive(s, () => report.checkPayments(tradeOf(count, unpaidEvery), s.ask))
  const lines = [
    `${many(count)} trade orders, ${many(unpaid.length)} not marked paid`,
    `questions asked: ${many(s.asked.length)}, open before the first answer: ${r.firstWave}, most open at once: ${s.most}`
  ]
  const fail = async (why) => {
    if (why !== 'paid' && why !== 'each' && !(await askLimitedWorks())) {
      const error = new Error('This task asks at most four at once; askLimited, from task 2, does not do that yet. If checkPayments uses it, make task 2 pass first.')
      error.name = 'NeedsEarlierTask'
      throw error
    }
    return { ok: false, seen: lines.join('\n'), why }
  }
  if (r.error) {
    lines.push(`it failed: ${shown(r.error)}`)
    return fail('threw')
  }
  if (!r.done) {
    lines.push('it never finished, though every question was answered')
    return fail('stuck')
  }
  if (s.asked.some((id) => !unpaid.includes(id))) return fail('paid')
  if (s.asked.length !== unpaid.length || new Set(s.asked).size !== unpaid.length) return fail('each')
  if (s.most > 4) return fail('over')
  if (r.firstWave < Math.min(4, unpaid.length)) return fail(r.firstWave <= 1 ? 'one' : 'fewer')
  if (!same(r.value, want)) {
    const got = Array.isArray(r.value) ? r.value : []
    const at = want.findIndex((w, i) => !same(got[i], w))
    lines.push(at === -1 || !Array.isArray(r.value) ? `it returned ${shown(r.value)}` : `payment ${at + 1} is ${shown(got[at])}`)
    return fail('answers')
  }
  return { ok: true, seen: lines.join('\n') }
}
