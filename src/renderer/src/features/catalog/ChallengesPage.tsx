import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LabMeta } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { EmptyState } from './EmptyState'
import { labProgress } from './labStatus'

type Difficulty = NonNullable<LabMeta['difficulty']>

const DIFFICULTY: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: 'Easy', className: 'bg-success/10 text-success' },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning' },
  hard: { label: 'Hard', className: 'bg-destructive/10 text-destructive' }
}

export function ChallengesPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all')

  const challenges = (labs ?? []).filter((lab) => lab.kind === 'challenge')
  const visible = challenges.filter((c) => difficulty === 'all' || c.difficulty === difficulty)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Challenges</h1>
          <p className="text-sm text-muted-foreground">
            One focused problem each. Open it, solve it, check it.
          </p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={difficulty}
          onValueChange={(value) => value && setDifficulty(value as 'all' | Difficulty)}
          aria-label="Filter by difficulty"
        >
          <ToggleGroupItem value="all" className="font-normal">
            All
          </ToggleGroupItem>
          {Object.entries(DIFFICULTY).map(([value, { label }]) => (
            <ToggleGroupItem key={value} value={value} className="font-normal">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {!labs || !progress ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={challenges.length ? 'No challenges at this difficulty' : 'No challenges yet'}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.map((challenge) => {
            const summary = labProgress(challenge, progress.chapters)
            const first = challenge.chapters[0]?.id
            const level = challenge.difficulty && DIFFICULTY[challenge.difficulty]
            return (
              <li key={challenge.id}>
                <Link
                  to={first ? `/learn/${challenge.id}/${first}` : `/labs/${challenge.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <LanguageIcon language={challenge.language} className="size-8" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-sm font-medium">{challenge.title}</div>
                    <div className="flex flex-wrap items-center gap-1">
                      {level && (
                        <Badge className={cn('border-transparent', level.className)}>
                          {level.label}
                        </Badge>
                      )}
                      {challenge.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="font-normal text-muted-foreground"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {summary.points} points
                  </span>
                  <span className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-xs">
                    {summary.status === 'completed' ? (
                      <>
                        <CircleCheck className="size-4 text-success" />
                        Solved
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not solved</span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
