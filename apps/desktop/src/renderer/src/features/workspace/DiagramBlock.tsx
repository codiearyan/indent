import { useEffect, useState } from 'react'
import { Code, Maximize2, Workflow } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useSettings } from '@/stores/settings'
import { CodeBlock } from './CodeBlock'
import { type Diagram, drawDiagram } from './diagram'
import { IconButton } from './IconButton'

type Drawn = Diagram | { failed: true } | null

/** A diagram from a fenced `mermaid` block, with its source one click away. */
export function DiagramBlock({ code }: { code: string }): React.JSX.Element {
  const theme = useSettings((s) => s.theme)
  const [drawn, setDrawn] = useState<Drawn>(null)
  const [showSource, setShowSource] = useState(false)
  const [large, setLarge] = useState(false)

  useEffect(() => {
    let live = true
    drawDiagram(code).then(
      (diagram) => live && setDrawn(diagram),
      () => live && setDrawn({ failed: true })
    )
    return () => {
      live = false
    }
  }, [code, theme])

  if (drawn && 'failed' in drawn) {
    return (
      <>
        <p className="text-[13px] text-muted-foreground">
          This diagram could not be drawn, so here is its source.
        </p>
        <CodeBlock code={code} language="mermaid" />
      </>
    )
  }

  // The library sanitizes the SVG in strict mode.
  const picture = drawn && <div dangerouslySetInnerHTML={{ __html: drawn.svg }} />

  return (
    <figure className="code-block overflow-hidden rounded-lg border border-border bg-card">
      <figcaption className="flex h-9 items-center gap-1 border-b border-rule pr-1 pl-3 font-sans text-xs text-muted-foreground">
        <span className="flex-1">{showSource ? 'Diagram source' : 'Diagram'}</span>
        <IconButton
          label={showSource ? 'Show the diagram' : 'Show the source'}
          onClick={() => setShowSource(!showSource)}
        >
          {showSource ? <Workflow /> : <Code />}
        </IconButton>
        <IconButton label="Open larger" disabled={!drawn} onClick={() => setLarge(true)}>
          <Maximize2 />
        </IconButton>
      </figcaption>
      {showSource ? (
        <pre>
          <code>{code}</code>
        </pre>
      ) : drawn ? (
        <div
          role="img"
          aria-label="Diagram; use Show the source to read it as text"
          className="overflow-x-auto p-4 [&_svg]:mx-auto [&_svg]:min-w-(--diagram-min)"
          // Fits the panel, but never below three quarters of its size, where labels get too small.
          style={{ '--diagram-min': `${drawn.width * 0.75}px` } as React.CSSProperties}
        >
          {picture}
        </div>
      ) : (
        <div className="p-4">
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      <Dialog open={large} onOpenChange={setLarge}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-[min(90vw,1100px)]">
          <DialogTitle>Diagram</DialogTitle>
          <div className="[&_svg]:h-auto [&_svg]:w-full">{picture}</div>
        </DialogContent>
      </Dialog>
    </figure>
  )
}
