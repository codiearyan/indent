import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

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
  return (
    <div className={cn('prose-lab', compact && 'prose-compact')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
