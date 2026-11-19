import { CHECKS_BEFORE_FIRST_HINT, MAX_HINTS, levelFor, pointsFor } from '@shared/rules'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

const EXAMPLE_POINTS = 20

function levelStarts(count: number): number[] {
  const starts = [0]
  while (starts.length < count) {
    const last = starts[starts.length - 1]
    starts.push(last + levelFor(last).span)
  }
  return starts
}

export function EarnDialog(props: {
  open: boolean
  onOpenChange(open: boolean): void
}): React.JSX.Element {
  const starts = levelStarts(5)

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What do I earn?</DialogTitle>
          <DialogDescription>Points come from tasks. They add up to your level.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-4 text-sm">
          <Rule term="Points">
            Every task shows its points. A task worth {EXAMPLE_POINTS} pays{' '}
            {pointsFor(EXAMPLE_POINTS, 'hard')} the first time it passes in hard mode and{' '}
            {pointsFor(EXAMPLE_POINTS, 'easy')} in easy mode.
          </Rule>
          <Rule term="Levels">
            Levels start at {starts.map((points, i) => `level ${i + 1} at ${points}`).join(', ')}{' '}
            points, and keep growing from there.
          </Rule>
          <Rule term="Hints">
            Each task has {MAX_HINTS} hints. The first unlocks after {CHECKS_BEFORE_FIRST_HINT}{' '}
            checks that are not all green, then one more with each such check. Hints cost nothing.
          </Rule>
          <Rule term="Modes">
            Hard mode pays full points. Easy mode pays half and lets you open a task&apos;s solution
            after you check it. Opening a solution keeps the chapter in easy mode.
          </Rule>
        </dl>
      </DialogContent>
    </Dialog>
  )
}

function Rule({ term, children }: { term: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="space-y-1">
      <dt className="font-medium">{term}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  )
}
