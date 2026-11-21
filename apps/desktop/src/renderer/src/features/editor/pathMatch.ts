export interface PathMatch {
  path: string
  /** Positions in `path` of the characters the query matched. */
  indices: number[]
  score: number
}

const SEPARATORS = '/._- '

function bestFrom(text: string, query: string, from: number): PathMatch | null {
  let best: PathMatch | null = null
  for (
    let start = text.indexOf(query[0], from);
    start !== -1;
    start = text.indexOf(query[0], start + 1)
  ) {
    const indices = [start]
    for (let q = 1; q < query.length; q++) {
      const next = text.indexOf(query[q], indices[q - 1] + 1)
      if (next === -1) return best
      indices.push(next)
    }
    let score = 0
    indices.forEach((i, n) => {
      score += 1
      if (n > 0 && indices[n - 1] === i - 1) score += 4
      if (i === 0 || SEPARATORS.includes(text[i - 1])) score += 3
    })
    if (!best || score > best.score) best = { path: text, indices, score }
  }
  return best
}

/**
 * Whether the query's characters appear in order in the path, ignoring case, and how well.
 * Runs of characters, starts of words and matches inside the file name rank higher.
 */
export function matchPath(query: string, path: string): PathMatch | null {
  const q = query.replace(/\s+/g, '').toLowerCase()
  if (!q) return { path, indices: [], score: 0 }
  const text = path.toLowerCase()
  const nameStart = text.lastIndexOf('/') + 1
  const inName = bestFrom(text, q, nameStart)
  const anywhere = bestFrom(text, q, 0)
  const nameScore = inName ? inName.score + 10 + (inName.indices[0] === nameStart ? 5 : 0) : -1
  const best =
    inName && nameScore >= (anywhere?.score ?? 0) ? { ...inName, score: nameScore } : anywhere
  return best && { ...best, path }
}

/** The files to offer: the best matches first, or with no query the open tabs, then the issue's files. */
export function quickOpenList(
  query: string,
  files: string[],
  open: string[],
  issueFiles: string[]
): PathMatch[] {
  if (!query.trim()) {
    const listed = [...new Set([...open, ...issueFiles])].filter((p) => files.includes(p))
    return listed.map((path) => ({ path, indices: [], score: 0 }))
  }
  return files
    .map((path) => matchPath(query, path))
    .filter((m): m is PathMatch => m !== null)
    .sort(
      (a, b) => b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path)
    )
}
