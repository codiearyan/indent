// Child process for run-trace.mjs: registers the trace hook, imports one learner file, calls one
// export and sends every recorded call to the parent over IPC, never through stdout.
import { AsyncLocalStorage } from 'node:async_hooks'
import { realpathSync } from 'node:fs'
import { register } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { exitAfterOutput } from './exit.mjs'

const [dir, file, exportName, argsJson] = process.argv.slice(2)
const MAX_CALLS = 300
const PREVIEW_LENGTH = 160

// Modules resolve to real paths, so the hook compares against the real path of the sandbox.
const root = realpathSync(dir)
register('./trace-hook.mjs', import.meta.url, { data: { root } })

const errorText = (err) => (err instanceof Error ? err.message : String(err))

const STOP = Symbol('stop')

/** A JSON-like line for a value, cut to PREVIEW_LENGTH characters. */
function preview(value) {
  let out = ''
  const ancestors = new Set()
  const put = (text) => {
    out += text
    if (out.length > PREVIEW_LENGTH) throw STOP
  }
  const items = (open, close, list, each) => {
    put(open)
    list.forEach((item, i) => {
      if (i > 0) put(', ')
      each(item)
    })
    put(close)
  }
  const show = (v) => {
    if (v === undefined) return put('undefined')
    if (v === null || typeof v === 'boolean' || typeof v === 'number') return put(String(v))
    if (typeof v === 'string') return put(JSON.stringify(v))
    if (typeof v === 'bigint') return put(`${v}n`)
    if (typeof v === 'symbol') return put(v.toString())
    if (typeof v === 'function') return put(`[Function ${v.name || 'anonymous'}]`)
    if (ancestors.has(v)) return put('[Circular]')
    if (v instanceof Date)
      return put(Number.isNaN(v.getTime()) ? 'Invalid Date' : JSON.stringify(v))
    if (v instanceof Error) return put(`${v.name}: ${v.message}`)
    if (v instanceof Promise) return put('Promise')
    ancestors.add(v)
    if (Array.isArray(v)) items('[', ']', v, show)
    else if (v instanceof Map) {
      items('Map {', '}', [...v], ([key, val]) => {
        show(key)
        put(' => ')
        show(val)
      })
    } else if (v instanceof Set) items('Set [', ']', [...v], show)
    else {
      const name = v.constructor?.name
      if (name && name !== 'Object') put(`${name} `)
      items('{', '}', Object.keys(v), (key) => {
        put(`${JSON.stringify(key)}: `)
        show(v[key])
      })
    }
    ancestors.delete(v)
  }
  try {
    show(value)
  } catch (err) {
    if (err !== STOP) return '[could not be shown]'
  }
  return out.length > PREVIEW_LENGTH ? `${out.slice(0, PREVIEW_LENGTH - 1)}…` : out
}

const depth = new AsyncLocalStorage()
let calls = 0

const send = (message) => process.send(message)

globalThis.__indentTrace = (fn, name, fileName) => {
  if (typeof fn !== 'function') return fn
  const traced = function (...args) {
    const run = () => (new.target ? Reflect.construct(fn, args, new.target) : fn.apply(this, args))
    if (calls >= MAX_CALLS) {
      if (calls++ === MAX_CALLS) send({ type: 'truncated' })
      return run()
    }
    const index = calls++
    const level = depth.getStore() ?? 0
    send({ type: 'call', index, fn: name, file: fileName, depth: level, args: args.map(preview) })
    let value
    try {
      value = depth.run(level + 1, run)
    } catch (err) {
      send({ type: 'end', index, threw: errorText(err) })
      throw err
    }
    if (value instanceof Promise) {
      value.then(
        (settled) => send({ type: 'end', index, returned: preview(settled) }),
        (err) => send({ type: 'end', index, threw: errorText(err) })
      )
    } else {
      send({ type: 'end', index, returned: preview(value) })
    }
    return value
  }
  Object.defineProperties(traced, {
    name: { value: fn.name },
    length: { value: fn.length }
  })
  traced.prototype = fn.prototype
  return traced
}

function finish(message) {
  process.send({ type: 'result', ...message }, exitAfterOutput)
}

try {
  const mod = await import(pathToFileURL(join(root, file)).href)
  if (typeof mod[exportName] !== 'function') {
    finish({ ok: false, error: `${exportName} is not an exported function of ${file}` })
  } else {
    await mod[exportName](...JSON.parse(argsJson))
    finish({ ok: true })
  }
} catch (err) {
  finish({ ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) })
}
