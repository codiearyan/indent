// Copied into the sandbox as .grader/drive.mjs. Uses the learner's store with keys and values of
// its own, and reads store.log, whose format this issue fixes. Every case runs in its own process,
// in a fresh folder.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as db from '../src/db.js'
import { attempt, compare, earlier, LOG, needs, shown, tried } from './helpers.mjs'

const logText = (dir) => readFile(join(dir, LOG), 'utf8').catch(() => null)
const showLog = (text) =>
  text === null ? 'there is no store.log' : text === '' ? 'store.log is empty' : `store.log holds ${shown(text)}`

async function withLog(folder, text) {
  const dir = join(folder, 'db')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, LOG), text)
  return dir
}

// A probe of task 1: one set adds its one record.
async function appends(folder) {
  const dir = join(folder, 'probe')
  const store = await needs('This task needs open() from task 1, which does not work yet.', () => db.open(dir))
  await needs('This task needs set() from task 1, which does not work yet.', () => store.set('probe', 'yes'))
  const text = await logText(dir)
  await needs('This task needs close() from task 1, which does not work yet.', () => store.close())
  if (text !== 'set\tprobe\tyes\n') earlier('This task needs task 1 first: set() does not add its record to store.log yet.')
}

// A probe of task 2: a log of sets comes back when the store opens.
async function replays(folder) {
  const dir = join(folder, 'probe-log')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, LOG), 'set\tprobe\tno\nset\tprobe\tyes\n')
  const store = await needs('This task needs open() from task 2, which does not work yet.', () => db.open(dir))
  if ((await store.get('probe')) !== 'yes') earlier('This task needs task 2 first: open() does not replay the records of store.log yet.')
  await store.close()
}

export async function appendCase(folder, kind) {
  if (kind === 'fresh') {
    const dir = join(folder, 'db', 'shop')
    const store = await db.open(dir)
    await store.set('paper', 'linen')
    const first = await logText(dir)
    await store.set('ink', 'black')
    await store.set('paper', 'cotton')
    const all = await logText(dir)
    await store.close()
    const closed = await logText(dir)
    const want = 'set\tpaper\tlinen\nset\tink\tblack\nset\tpaper\tcotton\n'
    const why =
      closed === want && all !== want ? 'late' : closed === null ? 'nofile' : first && all && !all.startsWith(first) ? 'rewritten' : 'format'
    return {
      ok: first === 'set\tpaper\tlinen\n' && all === want && closed === want,
      why,
      seen: `after the first set: ${showLog(first)}\nafter all three: ${showLog(all)}\nafter close(): ${showLog(closed)}`
    }
  }
  if (kind === 'existing') {
    const old = 'set\tpaper\tlinen\nset\tpaper\tcotton\nset\tink\tblack\n'
    const dir = await withLog(folder, old)
    const store = await db.open(dir)
    await store.set('binding', 'saddle')
    await store.close()
    const text = await logText(dir)
    const ok = text === `${old}set\tbinding\tsaddle\n`
    return { ok, why: text?.startsWith(old) ? 'format' : 'rewritten', seen: showLog(text) }
  }
  const dir = join(folder, 'db')
  const store = await db.open(dir)
  await store.set('note', '')
  await store.set('ink', 'blue')
  await store.close()
  const text = await logText(dir)
  return { ok: text === 'set\tnote\t\nset\tink\tblue\n', seen: showLog(text) }
}

export async function replayCase(folder, kind) {
  if (kind === 'log') {
    const dir = await withLog(folder, 'set\tpaper\tlinen\nset\tink\tblack\nset\tpaper\tcotton\nset\tbinding\tsaddle\n')
    const r = await compare(await db.open(dir), { paper: 'cotton', ink: 'black', binding: 'saddle', glue: undefined })
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'empty') {
    const dir = await withLog(folder, 'set\tnote\t\nset\tink\tblue\n')
    const r = await compare(await db.open(dir), { note: '', ink: 'blue' })
    return { ok: r.ok, seen: r.text }
  }
  if (kind === 'none') {
    await mkdir(join(folder, 'empty'))
    const a = await attempt(() => db.open(join(folder, 'empty')))
    const b = await attempt(() => db.open(join(folder, 'missing', 'shop')))
    const ra = a.threw ? { ok: false, text: '' } : await compare(a.value, { paper: undefined })
    const rb = b.threw ? { ok: false, text: '' } : await compare(b.value, { paper: undefined })
    return {
      ok: ra.ok && rb.ok,
      why: a.threw || b.threw ? 'threw' : undefined,
      seen: `open() of an empty folder ${tried(a)}${ra.text ? `\n${ra.text}` : ''}\nopen() of a folder that is not there ${tried(b)}${rb.text ? `\n${rb.text}` : ''}`
    }
  }
  await appends(folder)
  const dir = join(folder, 'db')
  const first = await db.open(dir)
  await first.set('paper', 'linen')
  await first.set('ink', 'black')
  await first.set('paper', 'cotton')
  await first.close()
  if (kind === 'twice') {
    const second = await db.open(dir)
    await second.set('glue', 'pva')
    await second.close()
  }
  const want = kind === 'twice' ? { paper: 'cotton', ink: 'black', glue: 'pva' } : { paper: 'cotton', ink: 'black' }
  const r = await compare(await db.open(dir), want)
  return { ok: r.ok, seen: `${r.text}\n${showLog(await logText(dir))}` }
}

export async function deleteCase(folder, kind) {
  await appends(folder)
  if (kind === 'record') {
    const dir = join(folder, 'db')
    const store = await db.open(dir)
    await store.set('paper', 'linen')
    await store.set('ink', 'black')
    await store.delete('paper')
    const after = await logText(dir)
    await store.delete('glue')
    const text = await logText(dir)
    await store.close()
    const want = 'set\tpaper\tlinen\nset\tink\tblack\ndelete\tpaper\n'
    const why = after === want ? 'missing' : 'format'
    return { ok: after === want && text === want, why, seen: `after delete('paper'): ${showLog(after)}\nafter delete('glue'), a key it did not hold: ${showLog(text)}` }
  }
  await replays(folder)
  if (kind === 'log') {
    const dir = await withLog(folder, 'set\tpaper\tlinen\nset\tink\tblack\ndelete\tpaper\nset\tglue\tpva\ndelete\tink\nset\tink\tblue\n')
    const r = await compare(await db.open(dir), { paper: undefined, ink: 'blue', glue: 'pva' })
    return { ok: r.ok, seen: r.text }
  }
  const dir = join(folder, 'db')
  const store = await db.open(dir)
  await store.set('paper', 'linen')
  await store.set('ink', 'black')
  await store.delete('paper')
  if (kind === 'back') {
    await store.delete('ink')
    await store.set('ink', 'blue')
  }
  await store.close()
  const want = kind === 'back' ? { paper: undefined, ink: 'blue' } : { paper: undefined, ink: 'black' }
  const again = await db.open(dir)
  const r = await compare(again, want)
  const why = (await again.has('paper')) ? 'returned' : undefined
  return { ok: r.ok, why, seen: `${r.text}\n${showLog(await logText(dir))}` }
}
