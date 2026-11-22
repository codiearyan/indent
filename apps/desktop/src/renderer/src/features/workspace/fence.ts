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
