import type { LabSummary, ProgressState } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { cn } from '@/lib/utils'

/**
 * A lab drawn as its issues, one cell each. A finished issue is a full cell; the issue being
 * worked on fills as its tasks pass.
 */
export function BuildStrip({
  lab,
  chapters,
  className
}: {
  lab: LabSummary
  chapters: ProgressState['chapters']
  className?: string
}): React.JSX.Element {
  const cells = lab.chapters.map((chapter) => {
    const progress = chapters[chapterKey(lab.id, chapter.id)]
    if (progress?.completedAt) return { id: chapter.id, fill: 1 }
    const passed = Object.values(progress?.tasks ?? {}).filter((task) => task.passed).length
    return { id: chapter.id, fill: chapter.taskCount > 0 ? passed / chapter.taskCount : 0 }
  })
  const finished = cells.filter((cell) => cell.fill === 1).length

  return (
    <div
      role="img"
      aria-label={`${finished} of ${cells.length} issues finished`}
      className={cn('flex h-1.5 gap-1', className)}
    >
      {cells.map((cell) => (
        <span
          key={cell.id}
          className="h-full min-w-0 flex-1 overflow-hidden rounded-full bg-accent"
        >
          <span
            className="block h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${cell.fill * 100}%` }}
          />
        </span>
      ))}
    </div>
  )
}
