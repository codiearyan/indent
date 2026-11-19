import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

export function Markdown({
  children,
  compact
}: {
  children: string
  compact?: boolean
}): React.JSX.Element {
  return (
    <div className={cn('prose-lab', compact && 'prose-compact')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
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
