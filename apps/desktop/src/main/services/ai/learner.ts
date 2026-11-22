import type { ChapterDef, LabMeta, LearnerPrefs, ProgressState } from '@shared/types'
import { chapterKey, currentStreak, goalFor, levelFor, localDate, walkStreak } from '@shared/rules'

/** Who the tutor is talking to, from the progress file and the setup's answers. */
export interface LearnerContext {
  level: number
  pointsToNextLevel: number
  totalPoints: number
  streak: number
  longestStreak: number
  freezes: number
  today: { tasksPassed: number; goal: number }
  repo: { title: string; issueNumber: number; issueCount: number; issuesFinished: number }
  issue: { tasksPassed: number; taskCount: number; hintsOpened: number }
  issuesFinished: number
  experience?: LearnerPrefs['experience']
  learnFirst?: LearnerPrefs['learnFirst']
}

const EXPERIENCES = ['new', 'some', 'experienced'] as const
const LEARN_FIRST = ['reading', 'videos'] as const

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.includes(value as T) ? (value as T) : undefined

export function learnerContext(
  progress: ProgressState,
  labId: string,
  lab: LabMeta,
  chapter: ChapterDef,
  prefs: LearnerPrefs | undefined,
  now = new Date()
): LearnerContext {
  const level = levelFor(progress.totalPoints)
  const walk = walkStreak(progress.activity, now)
  const issues = lab.parts.flatMap((part) => part.chapters)
  const finished = (key: string): boolean => !!progress.chapters[key]?.completedAt
  const here = progress.chapters[chapterKey(labId, chapter.id)]?.tasks ?? {}
  return {
    level: level.level,
    pointsToNextLevel: level.span - level.into,
    totalPoints: progress.totalPoints,
    streak: currentStreak(progress.activity, now),
    longestStreak: walk.longest,
    freezes: walk.freezes,
    today: {
      tasksPassed: progress.activity[localDate(now)]?.tasksPassed ?? 0,
      goal: goalFor(progress, now)
    },
    repo: {
      title: lab.title,
      issueNumber: issues.indexOf(chapter.id) + 1,
      issueCount: issues.length,
      issuesFinished: issues.filter((id) => finished(chapterKey(labId, id))).length
    },
    issue: {
      tasksPassed: chapter.tasks.filter((task) => here[task.id]?.passed).length,
      taskCount: chapter.tasks.length,
      hintsOpened: chapter.tasks.reduce((sum, task) => sum + (here[task.id]?.hintsShown ?? 0), 0)
    },
    issuesFinished: Object.values(progress.chapters).filter((c) => c.completedAt).length,
    experience: oneOf(EXPERIENCES, prefs?.experience),
    learnFirst: oneOf(LEARN_FIRST, prefs?.learnFirst)
  }
}
