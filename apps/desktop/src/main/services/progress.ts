import { copyFile, readFile, rename, stat, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { app, BrowserWindow, dialog } from 'electron'
import { chapterKey, localDate } from '@shared/rules'
import type { CheckResult, ProgressImport, ProgressState, TaskDef } from '@shared/types'
import { handle } from '../ipc'
import { dataFile } from '../paths'
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

const FILE_KIND = [{ name: 'Indent progress', extensions: ['json'] }]
// Far above any real progress file; keeps a wrong pick from being read into memory.
const MAX_FILE_BYTES = 20 * 1024 * 1024

async function exportFile(): Promise<string | null> {
  const options: Electron.SaveDialogOptions = {
    title: 'Export your progress',
    buttonLabel: 'Export',
    defaultPath: join(app.getPath('documents'), `indent-progress-${localDate()}.json`),
    filters: FILE_KIND
  }
  const window = BrowserWindow.getFocusedWindow()
  const result = await (window
    ? dialog.showSaveDialog(window, options)
    : dialog.showSaveDialog(options))
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, JSON.stringify(await getState(), null, 2))
  return result.filePath
}

/** The progress read from the last pick; applyImport takes only this, never a renderer's data. */
let picked: ProgressState | null = null

async function pickImport(): Promise<ProgressImport | null> {
  picked = null
  const options: Electron.OpenDialogOptions = {
    title: 'Import your progress',
    message: 'Pick a progress file you exported from Indent.',
    buttonLabel: 'Import',
    filters: FILE_KIND,
    properties: ['openFile']
  }
  const window = BrowserWindow.getFocusedWindow()
  const result = await (window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options))
  const file = result.filePaths[0]
  if (result.canceled || !file) return null
  if ((await stat(file)).size > MAX_FILE_BYTES) throw new Error(rules.NOT_A_PROGRESS_FILE)
  const incoming = rules.readProgressFile(await readFile(file, 'utf8'))
  picked = incoming
  return {
    file: basename(file),
    current: rules.summarize(await getState()),
    incoming: rules.summarize(incoming)
  }
}

async function applyImport(): Promise<ProgressState> {
  if (!picked) throw new Error('Pick a progress file first.')
  const next = picked
  picked = null
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
    exportFile,
    pickImport,
    applyImport,
    setDailyGoal: (goal) => update((s) => rules.setDailyGoal(s, goal, new Date()))
  })
}
