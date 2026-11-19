import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Markdown } from './Markdown'

/** Reveals the unlocked hints one at a time. */
export function TaskHints({
  hints,
  unlocked
}: {
  hints: string[]
  unlocked: number
}): React.JSX.Element | null {
  const [shown, setShown] = useState(0)
  const available = Math.min(unlocked, hints.length)

  if (available === 0) return null

  return (
    <div className="space-y-2">
      {hints.slice(0, shown).map((hint, i) => (
        <div key={i} className="flex gap-2 rounded-lg bg-muted px-3 py-2.5">
          <Lightbulb className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Hint {i + 1}</p>
            <Markdown compact>{hint}</Markdown>
          </div>
        </div>
      ))}
      {shown < available && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 font-normal"
          onClick={() => setShown(shown + 1)}
        >
          <Lightbulb />
          Show hint {shown + 1} of {hints.length}
        </Button>
      )}
    </div>
  )
}
