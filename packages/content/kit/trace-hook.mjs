// Module load hook for run-trace.mjs. Inside the sandbox copy only, it appends one statement per
// top-level function declaration that swaps the binding for a recorded wrapper. Declarations are
// mutable bindings, so calls inside the module and through its exports both go through it.
import { extname, isAbsolute, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { functionNames, TRACED_EXTENSIONS } from './declarations.mjs'

let root

export function initialize(data) {
  root = data.root
}

function learnerFile(url) {
  if (!url.startsWith('file:')) return null
  const path = fileURLToPath(url)
  const rel = relative(root, path)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  if (rel.split(sep).includes('node_modules') || !TRACED_EXTENSIONS.includes(extname(path))) {
    return null
  }
  return rel.split(sep).join('/')
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context)
  const file = learnerFile(url)
  // CommonJS keeps its exports from before the end of the file, so only ES modules are traced.
  if (!file || result.source == null) return result
  if (result.format !== 'module' && result.format !== 'module-typescript') return result
  const source =
    typeof result.source === 'string' ? result.source : new TextDecoder().decode(result.source)
  const names = functionNames(source)
  if (names.length === 0) return result
  const wraps = names.map(
    (name) =>
      `try { ${name} = __indentTrace(${name}, ${JSON.stringify(name)}, ${JSON.stringify(file)}) } catch {}`
  )
  return { ...result, source: `${source}\n;${wraps.join('\n')}\n` }
}
