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

const FENCE = /^(`{3,}|~{3,})(.*)$/
// List indentation and blockquote markers in front of a line inside a container.
const CONTAINER = /^[ \t>]*/

/**
 * Whether a fenced block's own source, as the parser saw it, ends with its closing fence. A block
 * still streaming, or cut off when a reply stopped, runs to the end of the reply instead.
 */
export function fenceClosed(raw: string): boolean {
  const lines = raw.split('\n').map((line) => line.replace(CONTAINER, ''))
  const open = FENCE.exec(lines[0])
  if (!open) return true
  if (lines.length < 2) return false
  const close = FENCE.exec(lines[lines.length - 1])
  return (
    !!close && close[1][0] === open[1][0] && close[1].length >= open[1].length && !close[2].trim()
  )
}
