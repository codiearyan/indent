// Copied into the sandbox as .grader/drive.mjs. Each export is one case: it hands the learner's
// functions the check's own clock and stock room and reports what happened, in order.
import { stage } from './waiting.mjs'

const FILE = '../src/later.js'

function room(s, counts) {
  s.shop({ askStockRoom: { callback: true, answer: ([name]) => ({ value: counts[name] }) } })
}

export async function remind(note, ms) {
  const s = stage()
  const mod = await s.load(FILE, ['remindLater'])
  if (!mod) return s.report()
  s.call('remindLater', () => mod.remindLater(note, ms))
  await s.run()
  return s.report()
}

export async function stock(name, counts) {
  const s = stage()
  room(s, counts)
  const mod = await s.load(FILE, ['stockLine'])
  if (!mod) return s.report()
  const done = s.spy('done')
  s.call('stockLine', () => mod.stockLine(name, done))
  await s.run()
  return s.report({ done: done.calls.map((c) => ({ args: c.args.map(s.show), afterAnswers: c.afterAnswers })) })
}

export async function two(first, second, counts) {
  const s = stage()
  room(s, counts)
  const mod = await s.load(FILE, ['twoLines'])
  if (!mod) return s.report()
  const done = s.spy('done')
  s.call('twoLines', () => mod.twoLines(first, second, done))
  await s.run({ order: 'newest' })
  return s.report({ done: done.calls.map((c) => ({ args: c.args.map(s.show), afterAnswers: c.afterAnswers })) })
}

/** holds: [id, ms] per parcel; keepBack: the ids whose function is called right away. */
export async function hold(holds, keepBack) {
  const s = stage()
  const mod = await s.load(FILE, ['holdParcel'])
  if (!mod) return s.report()
  const send = s.spy('send')
  const back = holds.map(([id, ms]) => s.call('holdParcel', () => mod.holdParcel(id, ms, send)))
  holds.forEach(([id], i) => {
    if (keepBack.includes(id) && typeof back[i] === 'function') {
      s.call(`the function holdParcel gave back for ${id}`, () => back[i]())
    }
  })
  await s.run()
  return s.report({
    gaveBack: back.map((b) => (typeof b === 'function' ? 'function' : s.show(b))),
    sent: send.calls.map((c) => c.args.map(s.show))
  })
}
