// Copied into the sandbox as .grader/drive.mjs. The record format is the learner's, so the check
// judges a batch by what a store opened later gives back, with store.log cut at every byte inside
// the batch. The stock task runs src/stock.js on a right store of the check's own. Every case runs
// in its own process, in a fresh folder.
import { join } from 'node:path'
import * as db from '../src/db.js'
import { attempt, compare, cutCopy, earlier, LOG, needs, note, shown, size, tried } from './helpers.mjs'

const BASE = [
  ['set', 'paper', 'linen'],
  ['set', 'ink', 'black'],
  ['set', 'mark', 'crème 🙂']
]
const BASE_STATE = { paper: 'linen', ink: 'black', mark: 'crème 🙂' }
const BATCH = [
  { op: 'set', key: 'paper', value: 'cotton' },
  { op: 'delete', key: 'ink' },
  { op: 'set', key: 'binding', value: 'saddle\nstitch' }
]
const BATCH_STATE = { paper: 'cotton', ink: undefined, mark: 'crème 🙂', binding: 'saddle\nstitch' }

async function written(lib, dir, changes) {
  const store = await lib.open(dir)
  for (const [op, key, value] of changes) {
    if (op === 'set') await store.set(key, value)
    else await store.delete(key)
  }
  await store.close()
}

async function reopened(lib, dir, want) {
  const store = await lib.open(dir)
  const r = await compare(store, want)
  await store.close()
  return r
}

const at = (n, before, after) => `store.log cut ${n - before} bytes into the batch's ${after - before} bytes`

// Of a state that is not what a cut should leave: is it half the batch, or did it lose the base?
function judged(store, r) {
  return Promise.all(Object.keys(BATCH_STATE).map(async (key) => [key, await store.get(key)])).then((pairs) => {
    const got = Object.fromEntries(pairs)
    const some = Object.entries(BATCH_STATE).some(([key, value]) => BASE_STATE[key] !== value && got[key] === value)
    return some ? 'half' : 'lost'
  })
}

export async function batchCase(folder, kind) {
  const dir = join(folder, 'db')
  if (kind === 'all') {
    await written(db, dir, BASE)
    const before = await size(join(dir, LOG))
    const store = await db.open(dir)
    await store.batch(BATCH)
    const grew = (await size(join(dir, LOG))) > before
    const now = await compare(store, BATCH_STATE)
    await store.close()
    const r = await reopened(db, dir, BATCH_STATE)
    const why = !now.ok ? 'memory' : r.ok && !grew ? 'late' : 'restart'
    return {
      ok: grew && now.ok && r.ok,
      why,
      seen: `store.log ${grew ? 'grew' : 'did not grow'} by the time batch() had finished\nthe same store after batch():\n${now.text}\nclosed and opened again:\n${r.text}`
    }
  }
  if (kind === 'order') {
    const store = await db.open(dir)
    await store.batch([
      { op: 'set', key: 'glue', value: 'pva' },
      { op: 'delete', key: 'glue' },
      { op: 'set', key: 'ink', value: 'black' },
      { op: 'set', key: 'ink', value: 'blue' }
    ])
    const now = await compare(store, { glue: undefined, ink: 'blue' })
    await store.close()
    const r = await reopened(db, dir, { glue: undefined, ink: 'blue' })
    return { ok: now.ok && r.ok, why: now.ok ? 'restart' : undefined, seen: `the same store after batch():\n${now.text}\nclosed and opened again:\n${r.text}` }
  }
  if (kind === 'compact') {
    await written(db, dir, BASE)
    const store = await db.open(dir)
    await store.batch(BATCH)
    await store.compact()
    await store.batch([{ op: 'set', key: 'glue', value: 'pva' }, { op: 'delete', key: 'mark' }])
    const want = { ...BATCH_STATE, glue: 'pva', mark: undefined }
    const now = await compare(store, want)
    await store.close()
    const r = await reopened(db, dir, want)
    return { ok: now.ok && r.ok, why: now.ok ? 'restart' : undefined, seen: `the same store after the batches:\n${now.text}\nclosed and opened again:\n${r.text}` }
  }
  await written(db, dir, BASE)
  const before = await size(join(dir, LOG))
  const store = await db.open(dir)
  await store.batch(BATCH)
  await store.close()
  const after = await size(join(dir, LOG))
  if (after <= before) return { ok: false, why: 'nothing', seen: `store.log did not grow with the batch (${before} bytes before, ${after} after)` }
  for (let n = before + 1; n < after; n++) {
    note(`opening ${at(n, before, after)}`)
    const copy = await cutCopy(dir, join(folder, `cut-${n}`), n)
    const opened = await attempt(() => db.open(copy))
    if (opened.threw) return { ok: false, why: 'openThrew', seen: `with ${at(n, before, after)}, open() ${tried(opened)}` }
    const cut = opened.value
    const r = await compare(cut, BASE_STATE)
    if (!r.ok) {
      const why = await judged(cut, r)
      await cut.close()
      return { ok: false, why, seen: `with ${at(n, before, after)}:\n${r.text}` }
    }
    if (kind === 'goOn') {
      await cut.set('glue', 'pva')
      await cut.close()
      note(`opening again after a set on ${at(n, before, after)}`)
      const again = await reopened(db, copy, { ...BASE_STATE, glue: 'pva', binding: undefined })
      if (!again.ok) return { ok: false, why: 'glued', seen: `with ${at(n, before, after)}, then set() of glue, closed and opened again:\n${again.text}` }
    } else await cut.close()
  }
  return { ok: true, seen: 'every cut inside the batch: none of its changes, everything before it kept' }
}

// Task 1 has to be right first, or a batch that writes nothing would pass for one that checks.
async function batches(folder) {
  const dir = join(folder, 'probe')
  const store = await needs('This task needs open() and batch() from task 1, which do not work yet.', () => db.open(dir))
  await needs('This task needs batch() from task 1, which does not work yet.', () =>
    store.batch([{ op: 'set', key: 'probe', value: 'yes' }, { op: 'set', key: 'other', value: 'too' }])
  )
  await store.close()
  const again = await db.open(dir)
  if ((await again.get('probe')) !== 'yes' || (await again.get('other')) !== 'too') {
    earlier('This task needs task 1 first: the changes of a batch are not there after a restart yet.')
  }
  await again.close()
}

const BAD = {
  value: [{ op: 'set', key: 'paper', value: 'cotton' }, { op: 'set', key: 'ink', value: 'blue' }, { op: 'set', key: 'glue', value: 7 }],
  op: [{ op: 'set', key: 'paper', value: 'cotton' }, { op: 'rename', key: 'ink' }],
  key: [{ op: 'delete', key: 'ink' }, { op: 'delete', key: null }, { op: 'set', value: 'cotton' }],
  noValue: [{ op: 'set', key: 'paper', value: 'cotton' }, { op: 'set', key: 'ink' }],
  shape: [{ op: 'set', key: 'paper', value: 'cotton' }, null]
}

export async function checkedCase(folder, kind) {
  await batches(folder)
  const dir = join(folder, 'db')
  await written(db, dir, BASE)
  const before = await size(join(dir, LOG))
  const store = await db.open(dir)
  const calls = kind === 'notArray' ? ['paper', undefined, { op: 'set', key: 'paper', value: 'cotton' }] : [kind === 'empty' ? [] : BAD[kind]]
  const tries = []
  for (const changes of calls) tries.push(await attempt(() => store.batch(changes)))
  const now = await compare(store, BASE_STATE)
  await store.close()
  const after = await size(join(dir, LOG))
  const r = await reopened(db, dir, BASE_STATE)
  const lines = calls.map((changes, i) => `batch(${shown(changes)}) ${tried(tries[i])}`)
  const refused = kind === 'empty' ? !tries[0].threw : tries.every((t) => t.threw && t.typeError)
  const why = !refused ? (kind === 'empty' ? 'emptyThrew' : 'notRefused') : !now.ok ? 'memory' : after !== before ? 'written' : 'restart'
  return {
    ok: refused && now.ok && r.ok && after === before,
    why,
    seen: `${lines.join('\n')}\nthe same store afterwards:\n${now.text}\nstore.log: ${before} bytes before, ${after} after`
  }
}

export async function stockCase(folder, kind) {
  const right = await import('./db.js')
  const stock = await import('../src/stock.js')
  const dir = join(folder, 'db')
  await written(right, dir, [['set', 'card', '1200'], ['set', 'envelope', '900'], ['set', 'poster', '60']])
  const store = await right.open(dir)
  if (kind === 'stockOf') {
    const card = stock.stockOf(store, 'card')
    const napkin = stock.stockOf(store, 'napkin')
    const ok = card === 1200 && napkin === 0
    return { ok, why: typeof card === 'string' ? 'text' : undefined, seen: `stockOf(db, 'card') gave ${shown(card)}\nstockOf(db, 'napkin') gave ${shown(napkin)}` }
  }
  if (kind === 'receive') {
    await stock.receive(store, 'card', 300)
    await stock.receive(store, 'napkin', 50)
    await store.close()
    const r = await reopened(right, dir, { card: '1500', napkin: '50', envelope: '900' })
    return { ok: r.ok, seen: `after the deliveries, closed and opened again:\n${r.text}` }
  }
  if (kind === 'refused') {
    const before = await size(join(dir, LOG))
    const result = await attempt(() => stock.takeOrder(store, [{ item: 'card', count: 200 }, { item: 'poster', count: 100 }]))
    const named = result.threw && /poster/.test(result.error)
    await store.close()
    const r = await reopened(right, dir, { card: '1200', poster: '60' })
    const after = await size(join(dir, LOG))
    const why = /ERR_ACCESS_DENIED/.test(result.error) ? 'denied' : !result.threw ? 'notRefused' : !named ? 'unnamed' : 'changed'
    return { ok: named && r.ok && after === before, why, seen: `takeOrder() ${tried(result)}\nclosed and opened again:\n${r.text}` }
  }
  const lines =
    kind === 'twice'
      ? [{ item: 'card', count: 100 }, { item: 'envelope', count: 300 }, { item: 'card', count: 50 }]
      : [{ item: 'card', count: 200 }, { item: 'envelope', count: 100 }]
  const want = kind === 'twice' ? { card: '1050', envelope: '600' } : { card: '1000', envelope: '800' }
  const before = await size(join(dir, LOG))
  await stock.takeOrder(store, lines)
  await store.close()
  const after = await size(join(dir, LOG))
  const r = await reopened(right, dir, want)
  if (!r.ok || kind !== 'cut') return { ok: r.ok, seen: `after the order, closed and opened again:\n${r.text}` }
  for (let n = before + 1; n < after; n++) {
    const copy = await cutCopy(dir, join(folder, `cut-${n}`), n)
    const cut = await reopened(right, copy, { card: '1200', envelope: '900' })
    if (!cut.ok) return { ok: false, why: 'half', seen: `with store.log cut ${n - before} bytes into the order's ${after - before} bytes:\n${cut.text}` }
  }
  return { ok: true, seen: 'every cut inside the order: none of it taken' }
}
