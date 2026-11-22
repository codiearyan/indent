// Relative imports keep this file loadable by vitest, which has no path aliases.
import type { ChapterSummary, LabSummary, PathDef, ProgressState } from '../../../../shared/types'
import { chapterKey } from '../../../../shared/rules'

export type Status = 'not-started' | 'in-progress' | 'completed'
type Chapters = ProgressState['chapters']

export interface ChapterState {
  status: Status
  tasksPassed: number
}

export function chapterState(
  labId: string,
  chapter: ChapterSummary,
  chapters: Chapters
): ChapterState {
  const progress = chapters[chapterKey(labId, chapter.id)]
  if (!progress) return { status: 'not-started', tasksPassed: 0 }
  const tasksPassed = Object.values(progress.tasks).filter((t) => t.passed).length
  return { status: progress.completedAt ? 'completed' : 'in-progress', tasksPassed }
}

export interface LabProgress {
  status: Status
  chaptersDone: number
  chapterCount: number
  taskCount: number
  tasksPassed: number
  points: number
  pointsEarned: number
  /** First chapter not completed; the first chapter once all are done. */
  nextChapterId?: string
  lastOpenedAt?: string
}

export function labProgress(lab: LabSummary, chapters: Chapters): LabProgress {
  let chaptersDone = 0
  let started = false
  let pointsEarned = 0
  let tasksPassed = 0
  let nextChapterId: string | undefined
  let lastOpenedAt: string | undefined
  for (const chapter of lab.chapters) {
    const progress = chapters[chapterKey(lab.id, chapter.id)]
    if (progress) {
      started = true
      for (const task of Object.values(progress.tasks)) {
        pointsEarned += task.pointsEarned
        if (task.passed) tasksPassed++
      }
      if (!lastOpenedAt || progress.lastOpenedAt > lastOpenedAt) {
        lastOpenedAt = progress.lastOpenedAt
      }
    }
    if (progress?.completedAt) chaptersDone++
    else nextChapterId ??= chapter.id
  }
  const chapterCount = lab.chapters.length
  const status: Status =
    chapterCount > 0 && chaptersDone === chapterCount
      ? 'completed'
      : started
        ? 'in-progress'
        : 'not-started'
  return {
    status,
    chaptersDone,
    chapterCount,
    taskCount: lab.chapters.reduce((sum, c) => sum + c.taskCount, 0),
    tasksPassed,
    points: lab.chapters.reduce((sum, c) => sum + c.points, 0),
    pointsEarned,
    nextChapterId: nextChapterId ?? lab.chapters[0]?.id,
    lastOpenedAt
  }
}

/** A roadmap stage is finished when it has repos, none still to come, and every one is finished. */
export function stageFinished(
  stage: PathDef['stages'][number],
  labs: Map<string, LabSummary>,
  chapters: Chapters
): boolean {
  return (
    stage.labs.length > 0 &&
    !stage.soon?.length &&
    stage.labs.every((id) => {
      const lab = labs.get(id)
      return !!lab && labProgress(lab, chapters).status === 'completed'
    })
  )
}
