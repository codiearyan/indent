import { useEffect, useRef, useState } from 'react'
import { SendHorizontal, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface AskAction {
  label: string
  run(): void
}

/**
 * The small bar that floats by a selection: quick questions for the tutor, and "Ask" for one in the
 * learner's own words. It sits in a positioned parent, at `left` and `top` in its pixels.
 */
export function AskBar({
  left,
  top,
  actions,
  onAsk,
  onClose
}: {
  left: number
  top: number
  actions: AskAction[]
  onAsk(question: string): void
  onClose(): void
}): React.JSX.Element {
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (asking) input.current?.focus()
  }, [asking])

  const send = (): void => {
    if (!question.trim()) return
    onAsk(question.trim())
    onClose()
  }

  return (
    <div
      role="toolbar"
      aria-label="Ask the tutor"
      className="motion-enter absolute z-20 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 font-sans shadow-md"
      style={{ left, top }}
      // Keeps the editor's or the terminal's selection while a button is pressed.
      onMouseDown={(event) => {
        if (!(event.target as HTMLElement).closest('input')) event.preventDefault()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      {asking ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <Input
            ref={input}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about this"
            aria-label="Your question for the tutor"
            className="h-7 w-60 text-[13px]"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label="Send to the tutor"
            disabled={!question.trim()}
          >
            <SendHorizontal />
          </Button>
        </form>
      ) : (
        <>
          <Sparkles
            className="mx-1 size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="xs"
              className="font-normal"
              onClick={() => {
                action.run()
                onClose()
              }}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="xs" className="font-normal" onClick={() => setAsking(true)}>
            Ask...
          </Button>
        </>
      )}
    </div>
  )
}
