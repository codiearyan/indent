// Finds the functions tracing can follow: top-level declarations that start a line.
// `const f = () => {}` and methods are not found, so they are not traced.
const DECLARATION =
  /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*[<(]/gm

/** Names of the top-level functions declared in `source`, each once, in order. */
export function functionNames(source) {
  return [...new Set([...source.matchAll(DECLARATION)].map((match) => match[1]))]
}

/** Files that the trace hook rewrites. */
export const TRACED_EXTENSIONS = ['.js', '.mjs', '.ts', '.mts']
