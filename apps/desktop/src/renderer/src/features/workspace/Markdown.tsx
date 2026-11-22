import { createContext, useContext, useMemo } from 'react'
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { CodeBlock } from './CodeBlock'
import { parseCard } from './cards'
import { DiagramBlock } from './DiagramBlock'
import { fenceClosed, fenceOf } from './fence'
import { CardPlaceholder, TeachingCard } from './TeachingCard'

type LinkHandler = (href: string) => boolean

/** The text being rendered and the link handler, for the renderers below. */
const MarkdownContext = createContext<{
  source: string
  streaming: boolean
  onLink?: LinkHandler
}>({ source: '', streaming: false })

// Renderers are module-level so they keep one identity: a block is never remounted by a re-render,
// so its scroll, its Copied state and its drawing survive keystrokes and streamed text.
function Pre({ node }: ExtraProps): React.JSX.Element {
  const { source, streaming, onLink } = useContext(MarkdownContext)
  const fence = fenceOf(node)
  const start = node?.position?.start.offset
  const end = node?.position?.end.offset
  // A fence still streaming, or cut off when a reply stopped, stays code until it closes.
  const closed = start === undefined || fenceClosed(source.slice(start, end))
  if (fence.language === 'mermaid' && closed) return <DiagramBlock code={fence.code} />
  if (fence.language === 'card') {
    if (!closed && streaming) return <CardPlaceholder />
    const card = closed && parseCard(fence.code)
    if (card) return <TeachingCard card={card} onLink={onLink} />
    return (
      <>
        <p className="text-[13px] text-muted-foreground">
          {closed
            ? 'This card could not be shown, so here is what the tutor wrote.'
            : 'The reply stopped before this card was finished, so here is what arrived.'}
        </p>
        <CodeBlock code={fence.code} language="json" />
      </>
    )
  }
  return <CodeBlock {...fence} />
}

function Link({ href, children }: React.ComponentProps<'a'>): React.JSX.Element {
  const { onLink } = useContext(MarkdownContext)
  return (
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
}

const components: Components = { pre: Pre, a: Link }

export function Markdown({
  children,
  compact,
  streaming = false,
  onLink
}: {
  children: string
  compact?: boolean
  /** The text is still arriving; a block that is not closed yet may still be finished. */
  streaming?: boolean
  /** Handles a clicked link inside the app; returning false lets it open in the browser. */
  onLink?: LinkHandler
}): React.JSX.Element {
  const context = useMemo(
    () => ({ source: children, streaming, onLink }),
    [children, streaming, onLink]
  )
  return (
    <div className={cn('prose-lab', compact && 'prose-compact')}>
      <MarkdownContext.Provider value={context}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {children}
        </ReactMarkdown>
      </MarkdownContext.Provider>
    </div>
  )
}
