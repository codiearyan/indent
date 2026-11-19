export type TokenKind = 'comment' | 'string' | 'number' | 'keyword' | 'plain'

export interface Token {
  kind: TokenKind
  text: string
}

const KEYWORDS = new Set(
  (
    'as break case catch class const continue default do else export extends false for function ' +
    'if import in instanceof interface let new null of return switch this throw true try type ' +
    'typeof undefined while number string boolean void'
  ).split(' ')
)

// shortcut: works one line at a time, so a block comment or template spanning lines is not colored
const TOKEN =
  /(\/\/.*|\/\*.*?\*\/)|('(?:\\.|[^'\\])*'?|"(?:\\.|[^"\\])*"?|`(?:\\.|[^`\\])*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g

export function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  const push = (kind: TokenKind, text: string): void => {
    const last = tokens.at(-1)
    if (kind === 'plain' && last?.kind === 'plain') last.text += text
    else if (text) tokens.push({ kind, text })
  }
  let at = 0
  for (const match of line.matchAll(TOKEN)) {
    push('plain', line.slice(at, match.index))
    const [text, comment, string, number, word] = match
    if (comment) push('comment', text)
    else if (string) push('string', text)
    else if (number) push('number', text)
    else push(word && KEYWORDS.has(word) ? 'keyword' : 'plain', text)
    at = match.index + text.length
  }
  push('plain', line.slice(at))
  return tokens
}
