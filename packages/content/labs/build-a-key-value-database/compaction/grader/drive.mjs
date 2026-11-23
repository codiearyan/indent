// Copied into the sandbox as .grader/drive.mjs. The record format is the learner's, so the check
// judges compaction by what the store gives back and by the size of store.log next to a fresh
// store's log; it never reads the records. Every case runs in its own process, in a fresh folder.
import { link, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as db from '../src/db.js'
import { bytesOf, compare, earlier, LOG, needs, size, watchRemovals } from './helpers.mjs'

const CHANGES = [
  ['set', 'paper', 'linen'],
  ['set', 'ink', 'black'],
  ['set', 'paper', 'cotton'],
  ['set', 'glue', 'pva'],
  ['set', 'note', 'Fragile:\nkeep dry'],
  ['set', 'paper', 'kraft'],
  ['delete', 'glue'],
  ['set', 'ink', 'blue'],
  ['set', 'mark', 'crème 🙂']
]
const STATE = { paper: 'kraft', ink: 'blue', note: 'Fragile:\nkeep dry', mark: 'crème 🙂', glue: undefined }

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

// The size of the log of a fresh store in which each key of `state` was set once.
async function freshSize(folder, state) {
  const dir = join(folder, 'fresh')
  const live = Object.entries(state).filter(([, value]) => value !== undefined)
  await written(dir, live.map(([key, value]) => ['set', key, value]))
  return size(join(dir, LOG))
}

async function compacted(dir) {
  const store = await db.open(dir)
  await store.compact()
  await store.close()
}

const sizes = (got, fresh, before) =>
  `store.log: ${before} bytes before compact(), ${got} after; a fresh store with each key set once: ${fresh}`

export async function compactCase(folder, kind) {
  const dir = join(folder, 'db')
  const changes = kind === 'empty' ? [...CHANGES, ...Object.keys(STATE).map((key) => ['delete', key])] : CHANGES
  const want = kind === 'empty' ? Object.fromEntries(Object.keys(STATE).map((key) => [key, undefined])) : STATE
  await written(dir, changes)
  const before = await size(join(dir, LOG))
  await compacted(dir)
  if (kind === 'twice') await compacted(dir)
  const got = await size(join(dir, LOG))
  const fresh = await freshSize(folder, want)
  const r = await reopened(dir, want)
  const unswapped = await stat(join(dir, `${LOG}.new`)).then(() => true, () => false)
  const why = !r.ok ? 'lost' : got === before ? (unswapped ? 'unswapped' : 'same') : got > fresh ? 'long' : 'short'
  return { ok: r.ok && got === fresh, why, seen: `${r.text}\n${sizes(got, fresh, before)}` }
}

// Task 1 has to be right before the way the new log takes its place can be judged.
async function compacts(folder) {
  const dir = join(folder, 'probe')
  await written(dir, CHANGES)
  await needs('This task needs compact() from task 1, which does not work yet.', () => compacted(dir))
  const r = await reopened(dir, STATE)
  const fresh = await freshSize(join(folder, 'probe-fresh'), STATE)
  if (!r.ok || (await size(join(dir, LOG))) !== fresh) earlier('This task needs task 1 first: after compact() the log does not hold one record per key yet.')
}

export async function swapCase(folder, kind) {
  await compacts(folder)
  const dir = join(folder, 'db')
  const log = join(dir, LOG)
  await written(dir, CHANGES)
  if (kind === 'inPlace') {
    const old = await bytesOf(log)
    // Some systems and network folders cannot give a file a second name: say so, judge the rest.
    const linked = await link(log, join(folder, 'old-log')).then(() => true, () => false)
    const removed = watchRemovals(log)
    await compacted(dir)
    const kept = !linked || (await bytesOf(join(folder, 'old-log'))).equals(old)
    const leftover = await stat(`${log}.new`).then(() => true, () => false)
    const r = await reopened(dir, STATE)
    const why = !kept ? 'inPlace' : removed.length ? 'removed' : leftover ? 'leftover' : 'lost'
    const said = [
      !linked
        ? 'this system cannot give a file a second name, so the check could not see whether the old log was written over'
        : kept
          ? 'the bytes of the old log were left as they were'
          : 'the bytes of the old log were written over',
      removed.length ? `store.log was taken away along the way (${removed.join(', ')})` : 'store.log was never taken away',
      leftover ? 'store.log.new is still there afterwards' : 'no store.log.new is left'
    ]
    return { ok: kept && !removed.length && !leftover && r.ok, why, seen: `${said.join('\n')}\n${r.text}` }
  }
  // What a stop halfway through an earlier compaction left: part of a new log, which may even end
  // on a whole record and so look like a log of its own.
  const half =
    kind === 'junk'
      ? 'half a new log from a stop\nset 5 3\nsneakyes\n{"op":"set","key":"sneak"'
      : await (async () => {
          const other = join(folder, 'other')
          await written(other, [['set', 'paper', 'kraft']])
          return bytesOf(join(other, LOG))
        })()
  await writeFile(`${log}.new`, half)
  const opened = await reopened(dir, { ...STATE, sneak: undefined })
  await compacted(dir)
  const after = await reopened(dir, { ...STATE, sneak: undefined })
  const got = await size(log)
  const fresh = await freshSize(folder, STATE)
  const leftover = await stat(`${log}.new`).then(() => true, () => false)
  const why = !opened.ok ? 'readNew' : !after.ok || got !== fresh ? 'added' : leftover ? 'staleNew' : undefined
  return {
    ok: opened.ok && after.ok && got === fresh && !leftover,
    why,
    seen: `opened with that store.log.new beside the log:\n${opened.text}\nafter compact(), closed and opened again:\n${after.text}\nstore.log is ${got} bytes; a fresh store with each key set once: ${fresh}\n${leftover ? 'the store.log.new from the earlier stop is still there' : 'no store.log.new is left'}`
  }
}

export async function goOnCase(folder, kind) {
  await compacts(folder)
  const dir = join(folder, 'db')
  await written(dir, CHANGES)
  const store = await db.open(dir)
  await store.compact()
  if (kind === 'same') {
    const r = await compare(store, STATE)
    await store.close()
    return { ok: r.ok, seen: `the same store, right after compact():\n${r.text}` }
  }
  const want = { ...STATE, glue: 'gum arabic', paper: 'linen', ink: undefined }
  await store.set('glue', 'gum arabic')
  await store.set('paper', 'linen')
  if (kind === 'twice') await store.compact()
  await store.delete('ink')
  const now = await compare(store, want)
  await store.close()
  const r = await reopened(dir, want)
  return { ok: now.ok && r.ok, why: now.ok ? 'lostAfter' : 'memory', seen: `the same store after the changes:\n${now.text}\nclosed and opened again:\n${r.text}` }
}
