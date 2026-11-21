import { readFile, rename, writeFile } from 'fs/promises'
import type { CheckResult, ProgressState, TaskDef } from '@shared/types'
import { handle } from '../ipc'
import { dataFile } from '../paths'
import * as rules from './progressLogic'

let state: Promise<ProgressState> | undefined
let saving: Promise<void> = Promise.resolve()

async function load(): Promise<ProgressState> {
  const file = dataFile('progress.json')
  try {
    const saved = JSON.parse(await readFile(file, 'utf8')) as ProgressState
    rules.dropOldToolErrors(saved)
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

/** Applies a change and saves atomically; saves are queued so renames never interleave. */
async function update(change: (s: ProgressState) => void): Promise<ProgressState> {
  const s = await getState()
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

export function recordCheck(
  labId: string,
  chapterId: string,
  tasks: TaskDef[],
  results: CheckResult[]
): Promise<ProgressState> {
  return update((s) => rules.recordCheck(s, labId, chapterId, tasks, results, new Date()))
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

export function register(): void {
  handle('progress', {
    get: getState,
    touch: (labId, chapterId) => update((s) => rules.touch(s, labId, chapterId, new Date()))
  })
}
