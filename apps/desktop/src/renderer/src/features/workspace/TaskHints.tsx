import { useState } from 'react'
import { Lightbulb, LockIcon } from 'lucide-react'
import { hintsUnlocked, nextLockedHint } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Markdown } from './Markdown'

/** Reveals the unlocked hints one at a time, and says when the next one unlocks. */
export function TaskHints({
  hints,
  nonGreenChecks,
  passed
}: {
  hints: string[]
  nonGreenChecks: number
  passed: boolean
}): React.JSX.Element | null {
  const [shown, setShown] = useState(0)
  const available = Math.min(hintsUnlocked(nonGreenChecks), hints.length)
  const locked = passed ? null : nextLockedHint(nonGreenChecks, hints.length)

  if (available === 0 && !locked) return null

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
      {locked && (
        <p className="flex h-8 items-center gap-2 pl-0.5 text-[13px] text-muted-foreground">
          <LockIcon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          Hint {locked.hint} unlocks after{' '}
          {locked.checksLeft === 1
            ? 'your next check that does not pass'
            : `${locked.checksLeft} more checks that do not pass`}
        </p>
      )}
    </div>
  )
}
