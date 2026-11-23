// Copied into the sandbox as .grader/no-util.mjs and loaded first, in the issue where the learner
// writes the argument reader: Node's own reader in node:util is refused by behaviour as well as by
// reading the code, so the check judges the learner's reader.
import { registerHooks } from 'node:module'

const REFUSED = new Set(['node:util', 'util'])

registerHooks?.({
  resolve(spec, context, next) {
    if (REFUSED.has(spec) && !context.parentURL?.includes('/.grader/')) throw new Error(`RefusedImport: ${spec}`)
    return next(spec, context)
  }
})

const builtin = process.getBuiltinModule
if (builtin) {
  process.getBuiltinModule = (id) => {
    if (REFUSED.has(id)) throw new Error(`RefusedImport: ${id}`)
    return builtin(id)
  }
}
