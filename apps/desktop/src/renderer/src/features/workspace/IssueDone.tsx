import { useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck } from 'lucide-react'
import type { Chapter } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'

/** Shown above the tasks once all of them pass: where the learner is in the repo, and what next. */
export function IssueDone({
  chapter,
  earned,
  repoFinished
}: {
  chapter: Chapter
  earned: number
  repoFinished: boolean
}): React.JSX.Element {
  const navigate = useNavigate()
  const lab = useCatalog((s) => s.labs?.find((l) => l.id === chapter.labId))
  const chapters = useProgress((s) => s.progress?.chapters)
  const total = lab?.chapters.length

  const action = repoFinished
    ? { to: `/labs/${chapter.labId}/done`, label: 'See how it went' }
    : chapter.nextChapterId
      ? { to: `/learn/${chapter.labId}/${chapter.nextChapterId}`, label: 'Next issue' }
      : { to: `/labs/${chapter.labId}`, label: 'Back to the repo' }

  return (
    <div className="mt-4 rounded-lg bg-success/10 py-3 pr-3 pl-4">
      <div className="flex items-center gap-3">
        <CircleCheck className="size-5 shrink-0 text-success" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tabular-nums">
            {total ? `Issue ${chapter.number} of ${total} done` : 'Every task passed'}
            {repoFinished && '. Repo finished.'}
          </p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            You earned {earned} points in this issue.
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => navigate(action.to)}>
          {action.label}
          <ArrowRight />
        </Button>
      </div>
      {lab && chapters && (
        <BuildStrip
          lab={lab}
          chapters={chapters}
          className="mt-3 mr-1 ml-8 [&>span]:bg-foreground/10"
        />
      )}
    </div>
  )
}
