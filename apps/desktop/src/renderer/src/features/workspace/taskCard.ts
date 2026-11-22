import type { ChapterProgress, TaskDef } from '@shared/types'

export interface FocusTask {
  id: string
  number: number
  title: string
  status: 'passed' | 'failed' | 'open'
  /** The first task not passed yet: the one being worked on. */
  current: boolean
  /** The failed check's sentence, or one line of the description for the task being worked on. */
  note?: string
}

/** The first paragraph of a task's markdown as one plain line. */
export function firstLine(markdown: string): string {
  const paragraph = markdown.trim().split(/\n\s*\n/)[0] ?? ''
  return paragraph
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`|\*\*/g, '')
    .replace(/^\s*(#+|>|[-*]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** What the task card in focus mode shows: a mark per task and at most one short line each. */
export function focusTasks(tasks: TaskDef[], progress?: ChapterProgress): FocusTask[] {
  const current = tasks.find((task) => !progress?.tasks[task.id]?.passed)?.id
  return tasks.map((task, i) => {
    const base = { id: task.id, number: i + 1, title: task.title, current: task.id === current }
    const taskProgress = progress?.tasks[task.id]
    const result = taskProgress?.lastResult
    // A task that passed once and fails now shows the failure, as the task list does.
    if (result && !result.passed) {
      const failing = result.details.find((detail) => !detail.passed)
      return { ...base, status: 'failed', note: result.error || failing?.message || failing?.name }
    }
    if (taskProgress?.passed) return { ...base, status: 'passed' }
    return {
      ...base,
      status: 'open',
      note: base.current ? firstLine(task.description) : undefined
    }
  })
}
