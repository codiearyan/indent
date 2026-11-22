import { useEffect, useReducer } from 'react'
import type * as Monaco from 'monaco-editor'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePendingSuggestion } from './inlineSuggestions'

const NOTE_WIDTH = 210

/** A note after the cursor's line while a suggestion is being written, with a way to stop it. */
export function SuggestionPending({
  editor
}: {
  editor: Monaco.editor.IStandaloneCodeEditor | null
}): React.JSX.Element | null {
  const pending = usePendingSuggestion((s) => s.pending)
  const [, redraw] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!editor || !pending) return
    const subscriptions = [editor.onDidScrollChange(redraw), editor.onDidLayoutChange(redraw)]
    return () => subscriptions.forEach((s) => s.dispose())
  }, [editor, pending])

  if (!editor || !pending || editor.getModel() !== pending.model) return null
  const { lineNumber } = pending.position
  if (lineNumber > pending.model.getLineCount()) return null
  const end = editor.getScrolledVisiblePosition({
    lineNumber,
    column: pending.model.getLineMaxColumn(lineNumber)
  })
  const { width, height } = editor.getLayoutInfo()
  if (!end || end.top < 0 || end.top + end.height > height) return null

  return (
    <div
      role="status"
      className="motion-enter absolute z-10 flex items-center gap-1.5 rounded-md border border-border bg-popover py-0.5 pr-0.5 pl-2 font-sans text-xs text-muted-foreground shadow-md"
      style={{
        left: Math.max(8, Math.min(end.left + 16, width - NOTE_WIDTH)),
        top: end.top + end.height / 2,
        transform: 'translateY(-50%)'
      }}
      // Keeps the cursor in the editor while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
    >
      <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
      Writing a suggestion
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Stop the suggestion"
            onClick={() => {
              pending.stop()
              editor.focus()
            }}
          >
            <X />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Stop (Esc)</TooltipContent>
      </Tooltip>
    </div>
  )
}
