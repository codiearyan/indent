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
        <div
          key={i}
          className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2"
        >
          <Lightbulb className="mt-1 size-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Hint {i + 1}</p>
            <Markdown compact>{hint}</Markdown>
          </div>
        </div>
      ))}
      {shown < available && (
        <Button variant="ghost" size="xs" onClick={() => setShown(shown + 1)}>
          <Lightbulb className="text-warning" />
          Show hint {shown + 1} of {hints.length}
        </Button>
      )}
    </div>
  )
}
