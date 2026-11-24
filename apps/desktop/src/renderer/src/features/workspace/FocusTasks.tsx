import { ChevronDown, Loader2 } from 'lucide-react'
import type { Chapter } from '@shared/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useChapterProgress } from '@/stores/progress'
import { useRuntime } from '@/stores/runtime'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { focusTasks } from './taskCard'
import { IconButton } from './IconButton'
import { StatusIcon } from './TaskItem'
import { checkAll } from './useWorkspaceShortcuts'

/** Focus mode hides the lesson; this card keeps the tasks and why a check failed in sight. */
export function FocusTasks({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const progress = useChapterProgress(chapter.labId, chapter.id)
  const checking = useWorkspace((s) => s.checking)
  const toolsInstalling = useRuntime((s) => !!s.status?.installing)
  const toolsBroken = useRuntime((s) => !!s.status?.error)
  const open = useSettings((s) => s.panels.focusTasks)
  const zen = useSettings((s) => s.panels.zen)
  // Beside a page the open tutor takes the lesson's place; outside these the window has no room.
  const tutorInPlace = useSettings((s) => s.panels.chat && s.panels.browser) && !!chapter.preview
  const setPanel = useSettings((s) => s.setPanel)
  const tasks = focusTasks(chapter.tasks, progress)
  const passed = tasks.filter((task) => task.status === 'passed').length
  const failed = tasks.some((task) => task.status === 'failed')
  const mark = (id?: string, status?: string): React.JSX.Element => (
    <StatusIcon
      checking={id ? !!checking?.includes(id) : !!checking}
      failed={status === 'failed'}
      passed={status === 'passed'}
    />
  )

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        aria-expanded={false}
        onClick={() => setPanel('focusTasks', true)}
        className="motion-enter press gap-2 border-border bg-popover font-normal text-popover-foreground shadow-md dark:bg-popover"
      >
        {mark(undefined, failed ? 'failed' : passed === tasks.length ? 'passed' : undefined)}
        Tasks
        <span className="text-muted-foreground tabular-nums">
          {passed}/{tasks.length}
        </span>
      </Button>
    )
  }

  return (
    <section
      aria-label="Tasks"
      className="motion-enter flex min-h-0 w-80 flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-rule pr-1 pl-3">
        <h2 className="text-sm font-semibold">Tasks</h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {passed} of {tasks.length}
        </span>
        <span className="flex-1" />
        {(zen || tutorInPlace) && (
          <Button
            variant="ghost"
            size="xs"
            className="font-normal text-muted-foreground hover:text-foreground"
            onClick={() => {
              setPanel('zen', false)
              if (tutorInPlace) setPanel('chat', false)
            }}
          >
            Open lesson
          </Button>
        )}
        <IconButton
          label="Collapse tasks"
          aria-expanded
          onClick={() => setPanel('focusTasks', false)}
        >
          <ChevronDown />
        </IconButton>
      </header>
      <ol className="max-h-72 min-h-0 divide-y divide-rule overflow-y-auto zone-tasks">
        {tasks.map((task) => (
          <li key={task.id} className="flex gap-2.5 px-3 py-2.5">
            {mark(task.id, task.status)}
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="tabular-nums">{task.number}.</span> {task.title}
              </p>
              {task.note && (
                <p
                  title={task.note}
                  className={cn(
                    'mt-0.5 text-[13px] text-muted-foreground',
                    task.current ? 'line-clamp-4' : 'line-clamp-2'
                  )}
                >
                  {task.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {/* Outline: the editor's Run checks stays the view's one filled button. */}
      <footer className="shrink-0 border-t border-rule p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={checking !== null || toolsBroken}
          onClick={checkAll}
        >
          {checking && <Loader2 className="animate-spin motion-reduce:animate-none" />}
          {checking ? (toolsInstalling ? 'Getting ready...' : 'Running...') : 'Run checks'}
        </Button>
      </footer>
    </section>
  )
}
