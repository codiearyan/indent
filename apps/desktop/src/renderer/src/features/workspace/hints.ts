import { create } from 'zustand'
import type { ChapterProgress, TaskDef } from '@shared/types'
import { hintsUnlocked } from '@shared/rules'

interface ShownHints {
  /** How many hints each task shows, by `hintKey`. Kept for the session. */
  shown: Record<string, number>
  /** Which tasks have their help ladder open, by `hintKey`. */
  open: Record<string, boolean>
  setShown(key: string, count: number): void
  setOpen(key: string, open: boolean): void
}

export const useShownHints = create<ShownHints>()((set) => ({
  shown: {},
  open: {},
  setShown: (key, count) => set((s) => ({ shown: { ...s.shown, [key]: count } })),
  setOpen: (key, open) => set((s) => ({ open: { ...s.open, [key]: open } }))
}))

export function hintKey(labId: string, chapterId: string, taskId: string): string {
  return `${labId}/${chapterId}/${taskId}`
}

export type NextHint =
  | { kind: 'show'; task: number; taskId: string; hint: number }
  | { kind: 'done' }
  | { kind: 'locked' | 'all-shown'; task: number }

/** What the next-hint shortcut does: the next unlocked hint of the first task not passed yet. */
export function nextHint(
  tasks: Pick<TaskDef, 'id' | 'hints'>[],
  progress: ChapterProgress | undefined,
  shown: (taskId: string) => number
): NextHint {
  const index = tasks.findIndex((t) => !progress?.tasks[t.id]?.passed)
  if (index === -1) return { kind: 'done' }
  const task = tasks[index]
  const open = Math.min(hintsUnlocked(progress?.nonGreenChecks ?? 0), task.hints.length)
  const count = shown(task.id)
  if (count < open) return { kind: 'show', task: index + 1, taskId: task.id, hint: count + 1 }
  return { kind: open < task.hints.length ? 'locked' : 'all-shown', task: index + 1 }
}
