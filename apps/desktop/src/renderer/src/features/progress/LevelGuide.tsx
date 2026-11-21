import { Link } from 'react-router-dom'
import { levelFor } from '@shared/rules'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { levelRows } from './levels'

const number = (n: number): string => n.toLocaleString('en-US')

const HOW = [
  'Passing a task pays its points once, the first time it passes. Each task shows its points beside its title.',
  'Hints and checks that fail cost nothing. Points are never taken away.',
  'Each level takes more points than the one before.'
]

/** What a level is and how to reach the next one. Opens from `children`, the element clicked. */
export function LevelGuide({ children }: { children: React.ReactNode }): React.JSX.Element {
  const points = useProgress((s) => s.progress?.totalPoints ?? 0)
  const { level, into, span } = levelFor(points)
  const left = span - into

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Levels</DialogTitle>
          <DialogDescription>
            Your level shows how much you have built. Nothing is locked behind a level.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl tabular-nums">Level {level}</p>
            <p className="text-[13px] text-muted-foreground tabular-nums">
              {number(points)} points
            </p>
          </div>
          <div
            role="img"
            aria-label={`${number(left)} points to level ${level + 1}`}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent"
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(into / span) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            {number(left)} more to level {level + 1}
          </p>
        </div>

        <section>
          <h3 className="text-sm font-semibold">How to level up</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {HOW.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold">Where each level starts</h3>
          <ol className="mt-2 rounded-lg border border-border">
            {levelRows(level).map((row) => (
              <li
                key={row.level}
                aria-current={row.level === level ? 'true' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 border-b border-rule px-4 text-sm last:border-b-0',
                  row.level < level && 'text-muted-foreground'
                )}
              >
                <span className={cn('w-16', row.level === level && 'font-medium')}>
                  Level {row.level}
                </span>
                <span className="flex-1 text-[13px] text-muted-foreground tabular-nums">
                  {row.level === level && 'You are here'}
                  {row.level === level + 1 && `${number(left)} to go`}
                </span>
                <span className="tabular-nums">{number(row.start)} points</span>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-[13px] text-muted-foreground">
          Streaks and milestones show how often you practice. They are on{' '}
          <DialogClose asChild>
            <Link to="/year" className="text-foreground underline underline-offset-2">
              Activity
            </Link>
          </DialogClose>
          .
        </p>
      </DialogContent>
    </Dialog>
  )
}
