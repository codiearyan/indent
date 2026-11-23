// Copied into every sandbox as .grader/run.mjs: node run.mjs <case> <args as JSON> <folder>
// Calls one export of drive.mjs and prints {"reply": ...} as the last line of standard output.
import { registerHooks } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [name, argsJson, folder] = process.argv.slice(2)
const ALLOWED = new Set(['node:fs', 'node:fs/promises', 'node:path', 'node:buffer', 'fs', 'fs/promises', 'path', 'buffer'])
const src = pathToFileURL(join(process.cwd(), 'src')).href + '/'

// What a file in src/ may bring in, refused by behaviour as well as by reading the code.
registerHooks?.({
  resolve(spec, context, next) {
    if (context.parentURL?.startsWith(src) && !spec.startsWith('.') && !ALLOWED.has(spec)) {
      throw new Error(`RefusedImport: ${spec}`)
    }
    return next(spec, context)
  }
})

// process.getBuiltinModule loads a built-in without going through the hook above.
const builtin = process.getBuiltinModule
if (builtin) {
  process.getBuiltinModule = (id) => {
    if (!ALLOWED.has(id)) throw new Error(`RefusedImport: ${id}`)
    return builtin(id)
  }
}

const shown = (error) =>
  error instanceof Error ? `${error.name}${error.code ? ` [${error.code}]` : ''}: ${error.message}` : String(error)
let reply
try {
  const drive = await import('./drive.mjs')
  if (typeof drive[name] !== 'function') throw new Error(`The check has no case named ${name}`)
  reply = { ok: true, value: await drive[name](folder, ...JSON.parse(argsJson)) }
} catch (error) {
  reply = { ok: false, error: shown(error) }
}
process.stdout.write(`\n${JSON.stringify({ reply })}\n`, () => process.exit(0))
