import { Link } from 'react-router-dom'
import type { LabSummary } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import type { LabProgress } from './labStatus'

const STATUS_LABEL = {
  'not-started': 'Not started',
  'in-progress': 'Your progress',
  completed: 'Completed'
} as const

export function LabGrid({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
}

export function LabCard({
  lab,
  progress
}: {
  lab: LabSummary
  progress: LabProgress
}): React.JSX.Element {
  const { chaptersDone, chapterCount } = progress
  return (
    <Link
      to={`/labs/${lab.id}`}
      className="flex min-h-48 flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors outline-none hover:border-foreground/20 hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-base leading-snug font-medium">{lab.title}</h3>
        {lab.tags.length > 0 && (
          <div className="flex max-w-[50%] shrink-0 flex-wrap justify-end gap-1">
            {lab.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex items-baseline justify-between text-[13px] text-muted-foreground">
          <span>{STATUS_LABEL[progress.status]}</span>
          <span className="tabular-nums">
            {chaptersDone} / {chapterCount} chapters
          </span>
        </div>
        <Progress
          value={chapterCount ? (chaptersDone / chapterCount) * 100 : 0}
          aria-label={`${chaptersDone} of ${chapterCount} chapters completed`}
          className="h-1"
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {progress.taskCount} tasks, {progress.points} points
        </span>
        <LanguageIcon language={lab.language} />
      </div>
    </Link>
  )
}

export function LabCardSkeleton(): React.JSX.Element {
  return (
    <div className="flex min-h-48 flex-col gap-4 rounded-xl border border-border p-5">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <div className="mt-auto space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-1 w-full" />
      </div>
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}
