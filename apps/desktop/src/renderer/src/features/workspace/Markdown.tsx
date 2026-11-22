import { useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { CodeBlock } from './CodeBlock'
import { DiagramBlock } from './DiagramBlock'
import { fenceOf, openFenceStart } from './fence'

export function Markdown({
  children,
  compact,
  onLink
}: {
  children: string
  compact?: boolean
  /** Handles a clicked link inside the app; returning false lets it open in the browser. */
  onLink?(href: string): boolean
}): React.JSX.Element {
  const openAt = useMemo(() => openFenceStart(children), [children])
  // A new renderer each render would remount every block: scroll, Copied and colours reset.
  const components = useMemo<Components>(
    () => ({
      pre: ({ node }) => {
        const fence = fenceOf(node)
        // A fence still streaming (or cut off) stays code until it closes.
        const open = openAt !== null && (node?.position?.start.offset ?? -1) >= openAt
        if (fence.language === 'mermaid' && !open) return <DiagramBlock code={fence.code} />
        return <CodeBlock {...fence} />
      },
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (href && onLink?.(href)) event.preventDefault()
          }}
        >
          {children}
        </a>
      )
    }),
    [onLink, openAt]
  )
  return (
    <div className={cn('prose-lab', compact && 'prose-compact')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
