export interface LineRun {
  start: number
  end: number
}

/**
 * The runs of two or more lines that hold nothing but a comment, numbered from 1. `tokens` are
 * the language's tokens per line, so `//` inside a string and a comment after code do not count.
 */
export function commentRuns(
  lines: string[],
  tokens: { offset: number; type: string }[][]
): LineRun[] {
  const isComment = (text: string, lineTokens: { offset: number; type: string }[]): boolean => {
    if (text.trim() === '') return false
    return lineTokens.every((token, i) => {
      const part = text.slice(token.offset, lineTokens[i + 1]?.offset ?? text.length)
      return part.trim() === '' || token.type.startsWith('comment')
    })
  }
  const runs: LineRun[] = []
  let start = 0
  lines.forEach((text, i) => {
    const line = i + 1
    if (isComment(text, tokens[i] ?? [])) {
      if (!start) start = line
    } else {
      if (start && line - 1 > start) runs.push({ start, end: line - 1 })
      start = 0
    }
  })
  if (start && lines.length > start) runs.push({ start, end: lines.length })
  return runs
}

/** The line a cursor on `line` lands on once the runs are folded: the first line of its run. */
export function lineOutsideFolds(line: number, runs: LineRun[]): number {
  return runs.find((r) => line > r.start && line <= r.end)?.start ?? line
}
