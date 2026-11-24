export interface CodeLocation {
  path: string
  line: number
  column?: number
}

const SCRIPT = /\.[cm]?[jt]sx?$/
const LINE_COLUMN = /:(\d+)(?::(\d+))?/g

const decode = (text: string): string => {
  try {
    return decodeURI(text)
  } catch {
    return text
  }
}

/**
 * The first place in a check's output that names a script of the workspace with a line. Checks run
 * on a copy in a `check-*` folder, so an absolute path counts only inside such a copy or the
 * workspace itself; a relative one only where it starts the path.
 */
export function findLocation(
  output: string,
  paths: string[],
  workspaceDir: string
): CodeLocation | undefined {
  const scripts = paths.filter((p) => SCRIPT.test(p)).sort((a, b) => b.length - a.length)
  const workspace = workspaceDir.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase()
  let found: CodeLocation | undefined
  for (const raw of output.split('\n')) {
    const text = decode(raw).replace(/\\/g, '/')
    for (const match of text.matchAll(LINE_COLUMN)) {
      const before = text.slice(0, match.index)
      const path = scripts.find((p) => {
        if (!before.endsWith(p)) return false
        const head = before.slice(0, -p.length)
        return (
          /(^|[\s(])$/.test(head) ||
          /\/check-[^/]+\/$/.test(head) ||
          (workspace !== '' && head.toLowerCase().endsWith(`${workspace}/`))
        )
      })
      const line = Number(match[1])
      if (!path || line < 1) continue
      const column = match[2] ? Number(match[2]) : undefined
      // Node names a crash's line without a column, and its stack names it again with one.
      if (!found) found = { path, line, column }
      else if (found.path === path && found.line === line) found.column = column
      if (found.column) return found
    }
  }
  return found
}
