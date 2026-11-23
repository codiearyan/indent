// Copied into the sandbox as .grader/call.mjs: node call.mjs <file> <export> <args as JSON>
// Imports one of the learner's modules, calls one export with the check's own arguments and
// prints {"reply": ...} as the last line of standard output. An export named @NAME is not called
// but described: its plain values as they are, and each function as { fn: its name }. What an
// async generator gives is collected into a list, at most 1000 items.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [file, name, argsJson] = process.argv.slice(2)
const shown = (error) =>
  error instanceof Error ? `${error.name}${error.code ? ` [${error.code}]` : ''}: ${error.message}` : String(error)

function describe(value, depth = 0) {
  if (typeof value === 'function') return { fn: value.name }
  if (value === null || typeof value !== 'object' || depth > 4) return value
  if (Array.isArray(value)) return value.map((v) => describe(v, depth + 1))
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, describe(v, depth + 1)]))
}

let reply
try {
  const module = await import(pathToFileURL(join(import.meta.dirname, '..', file)).href)
  if (name.startsWith('@')) {
    const key = name.slice(1)
    reply = key in module ? { ok: true, value: describe(module[key]) } : { ok: false, missing: true, error: `${file} has no export named ${key}` }
  } else if (typeof module[name] !== 'function') {
    reply = { ok: false, missing: true, error: `${file} has no export named ${name}` }
  } else {
    let value = await module[name](...JSON.parse(argsJson))
    if (value && typeof value[Symbol.asyncIterator] === 'function') {
      const items = []
      for await (const item of value) if (items.push(item) >= 1000) break
      value = items
    }
    reply = { ok: true, value }
  }
} catch (error) {
  reply = { ok: false, error: shown(error) }
}
process.stdout.write(`\n${JSON.stringify({ reply })}\n`, () => process.exit(0))
