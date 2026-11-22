import { copyFile, readFile, rename, writeFile } from 'fs/promises'
import { chapterKey } from '@shared/rules'
import type { CheckResult, ProgressState, TaskDef } from '@shared/types'
import { handle } from '../ipc'
import { dataFile, safeId } from '../paths'
import { milestoneCatalog } from './content'
import * as rules from './progressLogic'

let state: Promise<ProgressState> | undefined
let saving: Promise<void> = Promise.resolve()

async function load(): Promise<ProgressState> {
  const file = dataFile('progress.json')
  try {
    const saved = JSON.parse(await readFile(file, 'utf8')) as ProgressState
    rules.dropOldToolErrors(saved)
    await backfillMilestones(saved)
    return saved
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('progress.json is unreadable; keeping it aside and starting fresh', error)
      await rename(file, `${file}.broken-${Date.now()}`).catch(() => {})
    }
    return rules.emptyProgress()
  }
}

const getState = (): Promise<ProgressState> => (state ??= load())

/** Progress saved before milestones existed gets them with the dates they were reached. */
async function backfillMilestones(s: ProgressState): Promise<void> {
  rules.recordMilestones(s, await milestoneCatalog().catch(() => undefined))
}

/** Applies a change and saves atomically; saves are queued so renames never interleave. */
async function update(change: (s: ProgressState) => void): Promise<ProgressState> {
  const s = await getState()
  rules.settleFreezes(s, new Date())
  change(s)
  const file = dataFile('progress.json')
  const json = JSON.stringify(s)
  saving = saving
    .catch(() => {})
    .then(async () => {
      await writeFile(`${file}.tmp`, json)
      await rename(`${file}.tmp`, file)
    })
  await saving
  return s
}

export async function recordCheck(
  labId: string,
  chapterId: string,
  tasks: TaskDef[],
  results: CheckResult[]
): Promise<ProgressState> {
  const key = chapterKey(labId, chapterId)
  const wasFinished = !!(await getState()).chapters[key]?.completedAt
  const s = await update((s) => {
    rules.recordCheck(s, labId, chapterId, tasks, results, new Date())
    rules.recordMilestones(s)
  })
  // Only a newly finished issue can finish a repo or a roadmap.
  if (wasFinished || !s.chapters[key]?.completedAt) return s
  const catalog = await milestoneCatalog().catch(() => undefined)
  return catalog ? update((s) => rules.recordMilestones(s, catalog)) : s
}

export const getProgress = (): Promise<ProgressState> => getState()

export function saveTip(
  labId: string,
  chapterId: string,
  taskId: string,
  tip: string
): Promise<ProgressState> {
  return update((s) => rules.setTip(s, labId, chapterId, taskId, tip, new Date()))
}

/** Makes `next` the progress; the replaced file stays beside it, so the change can be undone. */
export async function replaceProgress(next: ProgressState): Promise<ProgressState> {
  const file = dataFile('progress.json')
  await saving.catch(() => {})
  // A copy, so the progress on disk stays whole until the new one is written over it.
  await copyFile(file, `${file}.replaced-${Date.now()}`).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
  await backfillMilestones(next)
  state = Promise.resolve(next)
  return update(() => {})
}

export function register(): void {
  handle('progress', {
    get: () => update(() => {}),
    touch: (labId, chapterId) => update((s) => rules.touch(s, labId, chapterId, new Date())),
    setDailyGoal: (goal) => update((s) => rules.setDailyGoal(s, goal, new Date())),
    showHint: (labId, chapterId, taskId, hint) =>
      update((s) =>
        rules.showHint(s, safeId(labId), safeId(chapterId), safeId(taskId), hint, new Date())
      )
  })
}
