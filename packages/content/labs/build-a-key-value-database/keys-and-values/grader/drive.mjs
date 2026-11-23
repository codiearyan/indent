// Copied into the sandbox as .grader/drive.mjs. Uses the learner's store with keys and values of
// its own. Every case runs in its own process, in a fresh folder.
import { join } from 'node:path'
import * as db from '../src/db.js'
import { attempt, compare, earlier, needs, shown, tried } from './helpers.mjs'

const opened = (folder, name = 'db') =>
  needs('This task needs open() from task 1, which does not work yet.', () => db.open(join(folder, name)))

// Later tasks first make sure get and set work, so they can say plainly when task 1 is not done.
async function working(folder) {
  const store = await opened(folder)
  await needs('This task needs set() from task 1, which does not work yet.', () => store.set('probe', 'yes'))
  if ((await store.get('probe')) !== 'yes') earlier('This task needs task 1 first: get() does not give back what set() kept yet.')
  await store.delete?.('probe')
  return store
}

export async function keepCase(folder, kind) {
  if (kind === 'apart') {
    const a = await db.open(join(folder, 'a'))
    const b = await db.open(join(folder, 'b'))
    await a.set('ink', 'black')
    const before = await compare(b, { ink: undefined }, { has: false })
    await b.set('ink', 'red')
    const after = await compare(a, { ink: 'black' }, { has: false })
    return {
      ok: before.ok && after.ok,
      why: before.ok ? 'shared' : 'leak',
      seen: `store B after A.set('ink', 'black'): ${before.text}\nstore A after B.set('ink', 'red'): ${after.text}`
    }
  }
  const opening = db.open(join(folder, 'db'))
  const store = await opening
  if (store === undefined || store === null) return { ok: false, why: 'nothing', seen: 'open() gave undefined' }
  if (kind === 'two' && typeof opening?.then !== 'function') return { ok: false, why: 'sync', seen: 'open() gave the store itself, not a promise of it' }
  const plans = {
    two: [[['paper', 'linen'], ['ink', 'black']], { paper: 'linen', ink: 'black' }],
    again: [[['paper', 'linen'], ['paper', 'cotton']], { paper: 'cotton' }],
    missing: [[['paper', 'linen']], { paper: 'linen', binding: undefined }],
    exact: [[['code', '007'], ['size', ' A5 '], ['weight', '0300.50']], { code: '007', size: ' A5 ', weight: '0300.50' }]
  }
  const [sets, want] = plans[kind]
  for (const [key, value] of sets) await store.set(key, value)
  const r = await compare(store, want, { has: false })
  return { ok: r.ok, seen: r.text }
}

export async function emptyCase(folder, kind) {
  const store = await working(folder)
  await store.set('paper', 'linen')
  if (kind === 'empty') {
    await store.set('note', '')
    const r = await compare(store, { note: '', paper: 'linen' })
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'missing') {
    const r = await compare(store, { binding: undefined, paper: 'linen' })
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'delete') {
    await store.set('ink', 'black')
    await store.delete('paper')
    const r = await compare(store, { paper: undefined, ink: 'black' })
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'deleteMissing') {
    const result = await attempt(() => store.delete('binding'))
    const r = await compare(store, { binding: undefined, paper: 'linen' })
    return { ok: !result.threw && r.ok, why: result.threw ? 'threw' : undefined, seen: `delete('binding') ${tried(result)}\n${r.text}` }
  }
  await store.delete('paper')
  await store.set('paper', 'cotton')
  const r = await compare(store, { paper: 'cotton' })
  return { ok: r.ok, seen: r.text }
}

const NAMES = ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf']

export async function textCase(folder, kind) {
  const store = await working(folder)
  if (kind === 'names') {
    const r = await compare(store, Object.fromEntries(NAMES.map((name) => [name, undefined])))
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'setNames') {
    for (const name of NAMES) await store.set(name, `${name.length} sheets`)
    await store.delete('constructor')
    const want = Object.fromEntries(NAMES.map((name) => [name, `${name.length} sheets`]))
    want.constructor = undefined
    const r = await compare(store, want)
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'emptyKey') {
    await store.set('', 'blank')
    await store.set('paper', 'linen')
    const r = await compare(store, { '': 'blank', paper: 'linen' })
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'badSet') {
    const calls = [[7, 'linen'], ['paper', 7], ['paper', null], ['paper'], [undefined, 'linen'], [{}, 'linen'], ['paper', ['linen']]]
    const tries = []
    for (const args of calls) tries.push(await attempt(() => store.set(...args)))
    const r = await compare(store, { paper: undefined, 7: undefined, undefined: undefined, '[object Object]': undefined })
    const lines = calls.map((args, i) => `set(${args.map(shown).join(', ')}) ${tried(tries[i])}`)
    const refused = tries.every((t) => t.threw && t.typeError)
    return { ok: refused && r.ok, why: refused ? 'kept' : 'notRefused', seen: `${lines.join('\n')}\n${r.text}` }
  }
  await store.set('paper', 'linen')
  const calls = [['get', 7], ['has', null], ['delete', undefined], ['get', {}], ['has', 7]]
  const tries = []
  for (const [fn, key] of calls) tries.push(await attempt(() => store[fn](key)))
  const r = await compare(store, { paper: 'linen' })
  const lines = calls.map(([fn, key], i) => `${fn}(${shown(key)}) ${tried(tries[i])}`)
  return { ok: tries.every((t) => t.threw && t.typeError) && r.ok, seen: `${lines.join('\n')}\n${r.text}` }
}
