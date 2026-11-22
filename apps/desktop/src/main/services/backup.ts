import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, dirname, join } from 'path'
import { app, BrowserWindow, dialog } from 'electron'
import { localDate } from '@shared/rules'
import type { BackupRestored, ProgressImport, ProgressState } from '@shared/types'
import { handle } from '../ipc'
import { replaceFolder, unpack } from '../library'
import { safeId, workspaceDir, workspacesRoot } from '../paths'
import { run } from '../run'
import { restoreAiChoice, savedAiChoice } from './ai'
import { BACKUP_FORMAT, MANIFEST, NOT_A_BACKUP, readManifest } from './backupLogic'
import { getProgress, replaceProgress } from './progress'
import { NOT_A_PROGRESS_FILE, readProgressFile, summarize } from './progressLogic'
import { killAll } from './terminal'

// Far above any real progress file or settings; keeps a wrong pick from being read into memory.
const MAX_JSON_BYTES = 20 * 1024 * 1024

interface Picked {
  progress: ProgressState
  app: Record<string, unknown> | null
  ai: unknown
  /** Where the archive was unpacked, inside the work folder so its workspaces move by rename. */
  staging: string | null
  /** `<labId>/<chapterId>` of every workspace in the backup. */
  issues: string[]
}

/** The file read by the last pick; applyImport takes only this, never a renderer's data. */
let picked: Picked | null = null

const isId = (id: string): boolean => {
  try {
    safeId(id)
    return true
  } catch {
    return false
  }
}

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

async function showSave(options: Electron.SaveDialogOptions): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow()
  const result = await (window
    ? dialog.showSaveDialog(window, options)
    : dialog.showSaveDialog(options))
  return result.canceled || !result.filePath ? null : result.filePath
}

async function showOpen(options: Electron.OpenDialogOptions): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow()
  const result = await (window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options))
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

/** The workspaces of the issues in the progress that exist on disk, as `<labId>/<chapterId>`. */
async function workspacesOf(progress: ProgressState): Promise<string[]> {
  const keys = await Promise.all(
    Object.keys(progress.chapters).map(async (key) => {
      const [labId = '', chapterId = ''] = key.split('/')
      if (!isId(labId) || !isId(chapterId)) return null
      return (await exists(workspaceDir(labId, chapterId))) ? key : null
    })
  )
  return keys.filter((key): key is string => !!key)
}

async function exportFile(appSettings: unknown): Promise<string | null> {
  const settingsJson = JSON.stringify(appSettings ?? null)
  if (!appSettings || typeof appSettings !== 'object' || settingsJson.length > MAX_JSON_BYTES) {
    throw new Error('Those are not settings.')
  }
  const file = await showSave({
    title: 'Export a backup',
    buttonLabel: 'Export',
    defaultPath: join(app.getPath('documents'), `indent-backup-${localDate()}.tar.gz`),
    filters: [{ name: 'Indent backup', extensions: ['gz'] }]
  })
  if (!file) return null
  const progress = await getProgress()
  const staging = await mkdtemp(join(tmpdir(), 'indent-backup-'))
  const partial = `${file}.partial`
  try {
    const manifest = {
      format: BACKUP_FORMAT,
      progress,
      app: appSettings,
      ai: await savedAiChoice()
    }
    await writeFile(join(staging, MANIFEST), JSON.stringify(manifest))
    const issues = await workspacesOf(progress)
    // The repo tools download again on the new computer; .git stays, it is the work in git repos.
    await run('tar', [
      '-czf',
      partial,
      '--exclude',
      'node_modules',
      '-C',
      staging,
      MANIFEST,
      ...(issues.length ? ['-C', workspacesRoot(), ...issues] : [])
    ])
    await rename(partial, file)
    return file
  } finally {
    await Promise.all([rm(staging, { recursive: true, force: true }), rm(partial, { force: true })])
  }
}

async function readProgressOnly(file: string): Promise<Picked> {
  if ((await stat(file)).size > MAX_JSON_BYTES) throw new Error(NOT_A_PROGRESS_FILE)
  const progress = readProgressFile(await readFile(file, 'utf8'))
  return { progress, app: null, ai: null, staging: null, issues: [] }
}

async function issuesIn(staging: string): Promise<string[]> {
  const dirs = async (dir: string): Promise<string[]> =>
    (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && isId(entry.name))
      .map((entry) => entry.name)
  const labs = await dirs(staging)
  const nested = await Promise.all(
    labs.map(async (labId) => (await dirs(join(staging, labId))).map((ch) => `${labId}/${ch}`))
  )
  return nested.flat()
}

async function readArchive(file: string): Promise<Picked> {
  const staging = join(workspacesRoot(), '.import')
  await rm(staging, { recursive: true, force: true })
  try {
    // Links inside a workspace come back as links; one that points outside it is refused.
    await unpack(file, staging, { links: true }).catch(() => {
      throw new Error(NOT_A_BACKUP)
    })
    const text = await readFile(join(staging, MANIFEST), 'utf8').catch(() => '')
    const { progress, app, ai } = readManifest(text)
    return { progress, app, ai, staging, issues: await issuesIn(staging) }
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}

async function pickImport(): Promise<ProgressImport | null> {
  picked = null
  const file = await showOpen({
    title: 'Import a backup',
    message: 'Pick a backup or a progress file you exported from Indent.',
    buttonLabel: 'Import',
    filters: [{ name: 'Indent backup', extensions: ['gz', 'json'] }],
    properties: ['openFile']
  })
  if (!file) return null
  const next = file.endsWith('.json') ? await readProgressOnly(file) : await readArchive(file)
  picked = next
  return {
    file: basename(file),
    current: summarize(await getProgress()),
    incoming: summarize(next.progress),
    issues: next.issues.length,
    hasSettings: !!(next.app || next.ai)
  }
}

async function applyImport(): Promise<BackupRestored> {
  if (!picked) throw new Error('Pick a backup first.')
  const next = picked
  picked = null
  if (next.staging && next.issues.length) {
    // Shells running inside a replaced workspace would keep it busy and lose their place.
    killAll()
    const aside = join(workspacesRoot(), `.replaced-${Date.now()}`)
    for (const key of next.issues) {
      const [labId, chapterId] = key.split('/')
      const target = workspaceDir(labId, chapterId)
      await mkdir(dirname(target), { recursive: true })
      if (await exists(target)) await mkdir(join(aside, labId), { recursive: true })
      await replaceFolder(join(next.staging, labId, chapterId), target, join(aside, key))
    }
  }
  if (next.staging) await rm(next.staging, { recursive: true, force: true })
  const progress = await replaceProgress(next.progress)
  if (next.ai) await restoreAiChoice(next.ai)
  return { progress, app: next.app }
}

export function register(): void {
  handle('backup', { exportFile, pickImport, applyImport })
}
