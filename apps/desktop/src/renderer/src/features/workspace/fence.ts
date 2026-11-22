interface TextNode {
  value?: unknown
  children?: TextNode[]
}

const textOf = (node: TextNode | undefined): string =>
  typeof node?.value === 'string' ? node.value : (node?.children ?? []).map(textOf).join('')

/** The code and the language of a fenced block, from the `<pre><code class="language-x">` pair. */
export function fenceOf(pre: { children: unknown[] } | undefined): {
  code: string
  language?: string
} {
  const code = pre?.children[0] as (TextNode & { properties?: { className?: unknown } }) | undefined
  const className = code?.properties?.className
  const first = Array.isArray(className) ? String(className[0] ?? '') : ''
  const language = first.startsWith('language-') ? first.slice('language-'.length) : undefined
  return { code: textOf(code).replace(/\n$/, ''), language }
}

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/**
 * Where a fenced block that is still open at the end of `markdown` starts, as a character offset,
 * or null when every fence is closed. A reply cut off or still streaming ends inside one.
 */
export function openFenceStart(markdown: string): number | null {
  let open: { mark: string; at: number } | null = null
  let at = 0
  for (const line of markdown.split('\n')) {
    const match = FENCE.exec(line)
    if (match) {
      const [, mark, rest] = match
      if (!open) {
        if (!(mark[0] === '`' && rest.includes('`'))) open = { mark, at }
      } else if (mark[0] === open.mark[0] && mark.length >= open.mark.length && !rest.trim()) {
        open = null
      }
    }
    at += line.length + 1
  }
  return open?.at ?? null
}
