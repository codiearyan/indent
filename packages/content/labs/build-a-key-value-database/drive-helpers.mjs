// Copied into every sandbox as .grader/helpers.mjs. Tools the issue drivers share.
import fs from 'node:fs'
import { cp, readFile, stat, truncate } from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspect } from 'node:util'

export const LOG = 'store.log'

export const shown = (value) =>
  value instanceof Error
    ? `${value.name}${value.code ? ` [${value.code}]` : ''}: ${value.message}`
    : inspect(value, { breakLength: Infinity })

/** Said on standard error, so a case the check had to stop can say where it was. */
export const note = (text) => process.stderr.write(`@@at ${text}\n`)

function needsError(message) {
  const error = new Error(message)
  error.name = 'NeedsEarlierTask'
  return error
}

export function earlier(message) {
  throw needsError(message)
}

/** Stops the case with a plain sentence about an earlier task when `fn` throws. */
export async function needs(message, fn) {
  try {
    return await fn()
  } catch (error) {
    if (error?.name === 'NeedsEarlierTask') throw error
    throw needsError(`${message} It threw ${shown(error)}.`)
  }
}

/** Calls fn and says whether it threw, without letting the throw stop the case. */
export async function attempt(fn) {
  try {
    return { threw: false, value: await fn() }
  } catch (error) {
    return { threw: true, typeError: error instanceof TypeError, error: shown(error) }
  }
}

export const tried = (r) => (r.threw ? `threw ${r.error}` : 'did not throw')

/** The size of a file in bytes, 0 when it is not there. */
export const size = (file) => stat(file).then((s) => s.size, () => 0)

export const bytesOf = (file) => readFile(file).catch(() => Buffer.alloc(0))

/** A copy of the store folder `from` at `to`, with its log cut to its first `bytes` bytes. */
export async function cutCopy(from, to, bytes) {
  await cp(from, to, { recursive: true })
  await truncate(join(to, LOG), bytes)
  return to
}

/**
 * What the store gives for each key of `want`, and whether that is what `want` says. A value of
 * undefined in `want` means the key is not there; `has` asks has() as well as get().
 */
export async function compare(store, want, { has = true } = {}) {
  const lines = []
  let ok = true
  for (const [key, value] of Object.entries(want)) {
    const got = await store.get(key)
    const held = has ? await store.has(key) : undefined
    if (got !== value || (has && held !== (value !== undefined))) ok = false
    lines.push(has ? `${shown(key)}: get ${shown(got)}, has ${shown(held)}` : `get(${shown(key)}) gave ${shown(got)}`)
  }
  return { ok, text: lines.join('\n') }
}

// The names fs gives to the calls that remove or move a file away, in each of its three forms.
const REMOVERS = ['unlink', 'rm', 'rename', 'unlinkSync', 'rmSync', 'renameSync']

/**
 * Notes every call that removes `file` or moves it away, whatever form of fs makes it. The calls
 * still happen; the list says what a stop between two of them would have left.
 */
export function watchRemovals(file) {
  const seen = []
  const where = (path) => resolve(path instanceof URL ? fileURLToPath(path) : String(path))
  const wrap = (target, key) => {
    const original = target[key]
    target[key] = function (path, ...rest) {
      if (where(path) === resolve(file)) seen.push(key.replace('Sync', ''))
      return original.call(this, path, ...rest)
    }
  }
  for (const key of REMOVERS) {
    if (typeof fs[key] === 'function') wrap(fs, key)
    if (!key.endsWith('Sync') && typeof fs.promises[key] === 'function') wrap(fs.promises, key)
  }
  syncBuiltinESMExports()
  return seen
}
