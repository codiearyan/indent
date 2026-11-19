import type { LabSummary, ProgressState } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { cn } from '@/lib/utils'

/**
 * A lab drawn as what it is made of: one group per chapter, one cell per task.
 * A cell turns green when its task has passed, so the strip fills in as the lab gets built.
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
  const groups = lab.chapters.map((chapter) => {
    const tasks = chapters[chapterKey(lab.id, chapter.id)]?.tasks ?? {}
    const done = Object.values(tasks).filter((task) => task.passed).length
    return { id: chapter.id, count: chapter.taskCount, done }
  })
  const passed = groups.reduce((sum, group) => sum + group.done, 0)
  const total = groups.reduce((sum, group) => sum + group.count, 0)

  return (
    <div
      role="img"
      aria-label={`${passed} of ${total} tasks passed`}
      className={cn('flex h-1.5 gap-1', className)}
    >
      {groups.map((group) => (
        <div key={group.id} className="flex min-w-0 gap-px" style={{ flexGrow: group.count }}>
          {Array.from({ length: group.count }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-full min-w-0 flex-1 transition-colors first:rounded-l-full last:rounded-r-full',
                i < group.done ? 'bg-brand' : 'bg-accent'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
