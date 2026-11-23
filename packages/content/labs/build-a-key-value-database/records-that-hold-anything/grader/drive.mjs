// Copied into the sandbox as .grader/drive.mjs. The record format is the learner's, so the check
// never reads store.log: it opens the learner's store, changes it, closes it and opens it again,
// and it cuts the file short at bytes of its own choosing. Every case runs in its own process.
import { join } from 'node:path'
import * as db from '../src/db.js'
import { compare, cutCopy, earlier, LOG, note, shown, size } from './helpers.mjs'

async function written(dir, changes) {
  const store = await db.open(dir)
  for (const [op, key, value] of changes) {
    if (op === 'set') await store.set(key, value)
    else await store.delete(key)
  }
  await store.close()
}

async function reopened(dir, want) {
  const store = await db.open(dir)
  const r = await compare(store, want)
  await store.close()
  return r
}

export async function anyCase(folder, kind) {
  const plans = {
    lines: {
      note: 'Fragile:\nkeep dry',
      address: '12 Mill Lane\r\nAshgrove',
      table: 'linen\tcotton\tkraft',
      trail: 'ends with a break\n',
      lead: '\nstarts with one'
    },
    keys: {
      'two\nlines': 'a',
      'a\ttab': 'b',
      'colon:key': 'c',
      'pipe|key': 'd',
      'equals=key': 'e',
      'quote"key': 'f',
      'back\\slash': 'g',
      'space key': 'h',
      '': 'i',
      '12': 'j'
    },
    shaped: {
      paper: 'linen',
      one: 'x\nset\tsneak\tyes',
      two: '5:hello',
      three: '\\n and \\t',
      four: '"}\n{"op":"set","key":"sneak","value":"yes"}',
      five: 'delete\tpaper\n',
      six: 'set 5 3\nsneakyes\n',
      seven: '\\\\\n'
    },
    odd: { accent: 'crème', kanji: '日本語の紙', face: 'ok 🙂', nul: 'a\u0000b', joined: 'é', ligature: 'ﬁne' }
  }
  const dir = join(folder, 'db')
  if (kind === 'mixed') {
    await written(dir, [
      ['set', 'line\none', 'first\nvalue'],
      ['set', 'line\ntwo', ''],
      ['set', 'line\none', 'second\tvalue'],
      ['set', 'gone\n', 'soon'],
      ['delete', 'gone\n']
    ])
    const r = await reopened(dir, { 'line\none': 'second\tvalue', 'line\ntwo': '', 'gone\n': undefined })
    return { ok: r.ok, seen: r.text }
  }
  const want = plans[kind]
  await written(dir, Object.entries(want).map(([key, value]) => ['set', key, value]))
  const r = await reopened(dir, kind === 'shaped' ? { ...want, sneak: undefined } : want)
  return { ok: r.ok, seen: r.text }
}

const BASE = [
  ['set', 'paper', 'linen'],
  ['set', 'ink', 'black'],
  ['set', 'mark', 'crème 🙂']
]
const BASE_STATE = { paper: 'linen', ink: 'black', mark: 'crème 🙂' }

const LAST = {
  new: [['set', 'binding', 'saddle stitch'], { binding: undefined }],
  overwrite: [['set', 'paper', 'cotton'], {}],
  delete: [['delete', 'ink'], {}],
  lines: [['set', 'note', 'Fragile:\nkeep dry\nset\tsneak\tyes\n'], { note: undefined, sneak: undefined }],
  odd: [['set', 'face', '🙂🙂 é'], { face: undefined }]
}

// A store with BASE in it and one last change after, with the size of the log before and after it.
async function lastRecord(folder, kind) {
  const dir = join(folder, 'db')
  await written(dir, BASE)
  const before = await size(join(dir, LOG))
  await written(dir, [LAST[kind][0]])
  const after = await size(join(dir, LOG))
  return { dir, before, after, want: { ...BASE_STATE, ...LAST[kind][1] } }
}

// Task 1 has to be right for a case whose values hold line breaks.
async function anyText(folder) {
  const dir = join(folder, 'probe')
  await written(dir, [['set', 'probe', 'one\ntwo crème 🙂']])
  const store = await db.open(dir)
  if ((await store.get('probe')) !== 'one\ntwo crème 🙂') earlier('This task needs task 1 first: a value with a line break or an é does not come back whole after a restart yet.')
  await store.close()
}

const at = (n, before, after) => `store.log cut ${n - before} bytes into its last record of ${after - before} bytes`

export async function cutCase(folder, kind) {
  await anyText(folder)
  const { dir, before, after, want } = await lastRecord(folder, kind)
  if (after <= before) return { ok: false, why: 'nothing', seen: `the last change made store.log no longer (${before} bytes before, ${after} after)` }
  for (let n = before + 1; n < after; n++) {
    note(`opening ${at(n, before, after)}`)
    const copy = await cutCopy(dir, join(folder, `cut-${n}`), n)
    let store
    try {
      store = await db.open(copy)
    } catch (error) {
      return { ok: false, why: 'openThrew', seen: `with ${at(n, before, after)}, open() threw ${shown(error)}` }
    }
    const r = await compare(store, want)
    await store.close()
    if (!r.ok) {
      const touched = LAST[kind][0][1]
      const lost = Object.keys(BASE_STATE).some((key) => key !== touched && r.text.includes(`${shown(key)}: get undefined`))
      return { ok: false, why: lost ? 'lost' : 'read', seen: `with ${at(n, before, after)}:\n${r.text}` }
    }
  }
  return { ok: true, seen: `every cut inside the last record: the record left out, everything before it kept` }
}

// Task 2 has to be right before the store can carry on after a cut.
async function leavesOut(folder) {
  const dir = join(folder, 'probe')
  await written(dir, [['set', 'probe', 'yes']])
  const before = await size(join(dir, LOG))
  await written(dir, [['set', 'probe', 'no']])
  const after = await size(join(dir, LOG))
  for (let n = before + 1; n < after; n++) {
    const copy = await cutCopy(dir, join(folder, `probe-${n}`), n)
    const store = await db.open(copy).catch(() => earlier('This task needs task 2 first: open() throws on a log whose last record was cut short.'))
    if ((await store.get('probe')) !== 'yes') earlier('This task needs task 2 first: a last record cut short is not left out yet.')
    await store.close()
  }
}

export async function goOnCase(folder, kind) {
  await anyText(folder)
  await leavesOut(folder)
  const { dir, before, after, want } = await lastRecord(folder, kind === 'odd' ? 'odd' : 'new')
  for (let n = before + 1; n < after; n++) {
    note(`opening ${at(n, before, after)}, then changing it`)
    const copy = await cutCopy(dir, join(folder, `cut-${n}`), n)
    const expect = { ...want }
    const store = await db.open(copy)
    if (kind === 'delete') {
      await store.delete('paper')
      expect.paper = undefined
    } else {
      await store.set('glue', 'pva')
      expect.glue = 'pva'
    }
    await store.close()
    if (kind === 'twice') {
      const second = await db.open(copy)
      await second.set('gum', 'arabic')
      await second.close()
      expect.gum = 'arabic'
    }
    note(`opening again after changes made on ${at(n, before, after)}`)
    const r = await reopened(copy, expect)
    if (!r.ok) {
      const lost = Object.keys(BASE_STATE).some((key) => expect[key] && r.text.includes(`${shown(key)}: get undefined`))
      return { ok: false, why: lost ? 'lost' : 'glued', seen: `with ${at(n, before, after)}, then the changes, closed and opened again:\n${r.text}` }
    }
  }
  return { ok: true, seen: 'every cut inside the last record: the changes after it kept, and everything before it' }
}
