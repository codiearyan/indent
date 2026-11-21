import type {
  AiCompletionTask,
  AiConfig,
  ChapterProgress,
  TaskDef,
  TaskProgress
} from '@shared/types'

const MARKER = /^[ \t]*(?:\/\/|#)[ \t]*Task (\d+)\b/gm

/**
 * The task the learner is working on: the one whose `// Task N` marker sits last above the
 * cursor, else the first one not passed, in this file if one is.
 */
export function cursorTask(
  tasks: TaskDef[],
  progress: ChapterProgress | undefined,
  path: string,
  beforeCursor: string
): TaskDef | undefined {
  const marker = [...beforeCursor.matchAll(MARKER)].at(-1)
  const marked = marker ? tasks[Number(marker[1]) - 1] : undefined
  if (marked) return marked
  const open = tasks.filter((task) => !progress?.tasks[task.id]?.passed)
  return open.find((task) => task.file === path) ?? open[0]
}

/** What a completion request carries about the task; never its hints or steps. */
export function completionTask(
  task: TaskDef,
  progress: TaskProgress | undefined
): AiCompletionTask {
  return {
    title: task.title,
    description: task.description,
    failing: progress?.passed
      ? []
      : (progress?.lastResult?.details.filter((d) => !d.passed).map((d) => d.name) ?? [])
  }
}

/** No check has run on the task yet. */
export function untried(progress: TaskProgress | undefined): boolean {
  return !progress?.passed && !progress?.lastResult
}

/**
 * Suggestions come only when asked: always in "when I ask", and in "as I type" until the task
 * has had a check, so they never type the first try for the learner.
 */
export function waitsForRequest(
  config: AiConfig | null,
  task: TaskDef | undefined,
  progress: ChapterProgress | undefined
): boolean {
  if (!config?.enabled) return false
  if (config.suggestions === 'manual') return true
  return config.suggestions === 'auto' && !!task && untried(progress?.tasks[task.id])
}
