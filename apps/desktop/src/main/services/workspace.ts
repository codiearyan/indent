import { BrowserWindow, dialog } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { FolderMove, WorkspaceSnapshot } from '@shared/types'
import { handle } from '../ipc'
import {
  chapterContentDir,
  contentDir,
  setWorkspacesRoot,
  workspaceDir,
  workspacesRoot
} from '../paths'
import { ensureRuntime } from './checks'
import { loadChapter } from './content'
import { moveContents, planMove } from './moveFolder'
import { killAll } from './terminal'
import { isAppPath, resolveInside } from './workspaceFiles'
import { openWorkspace, resetWorkspace, resolveConflict } from './workspaceSync'

const queues = new Map<string, Promise<unknown>>()

// Opens, resets and conflict choices all write starter files; two at once would collide.
function oneAtATime<T>(key: string, job: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).then(job, job)
  queues.set(
    key,
    result.catch(() => {})
  )
  return result
}

type Job = (starterDir: string, dir: string, first: string[]) => Promise<WorkspaceSnapshot>

function inWorkspace(labId: string, chapterId: string, job: Job): Promise<WorkspaceSnapshot> {
  // The repo tools install while the learner reads, not inside their first Check.
  void ensureRuntime()
  const dir = workspaceDir(labId, chapterId)
  return oneAtATime(dir, async () => {
    const chapter = await loadChapter(labId, chapterId)
    return job(join(chapterContentDir(labId, chapterId), 'starter'), dir, chapter.files)
  })
}

async function write(
  labId: string,
  chapterId: string,
  path: string,
  content: string
): Promise<void> {
  const dir = workspaceDir(labId, chapterId)
  const file = resolveInside(dir, path)
  if (isAppPath(dir, file)) throw new Error(`Path outside workspace: ${path}`)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}

/** The destination of the last pick; moveRoot moves only there, never to a renderer's path. */
let picked: string | null = null

/** Asks for a folder and says where the work would go. Null when the person cancels. */
async function pickRoot(): Promise<FolderMove | null> {
  picked = null
  const current = workspacesRoot()
  const options: Electron.OpenDialogOptions = {
    title: 'Choose a folder for your work',
    message: 'Your work moves to the folder you pick. It must be empty.',
    buttonLabel: 'Use this folder',
    defaultPath: dirname(current),
    properties: ['openDirectory', 'createDirectory']
  }
  const window = BrowserWindow.getFocusedWindow()
  const result = await (window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options))
  if (result.canceled || !result.filePaths[0]) return null
  const plan = await planMove(current, result.filePaths[0], contentDir())
  picked = plan.to
  return { from: current, ...plan }
}

/** Moves all work to the folder the last pick approved, checked again in case it changed. */
async function moveRoot(): Promise<string> {
  if (!picked) throw new Error('Pick a folder first.')
  const current = workspacesRoot()
  const next = picked
  picked = null
  const plan = await planMove(current, next, contentDir())
  if (plan.inside || plan.to !== next) throw new Error('Pick an empty folder, or make a new one.')
  if (next === current) return current
  // Shells running inside the old folder would keep it busy and lose their place.
  killAll()
  await moveContents(current, next, ['.sandbox'])
  setWorkspacesRoot(next)
  return next
}

export function register(): void {
  handle('workspace', {
    open: (labId, chapterId) => inWorkspace(labId, chapterId, openWorkspace),
    writeFile: write,
    reset: (labId, chapterId) => inWorkspace(labId, chapterId, resetWorkspace),
    resolveConflict: (labId, chapterId, path, choice) =>
      inWorkspace(labId, chapterId, (starterDir, dir, first) =>
        resolveConflict(starterDir, dir, first, String(path), choice === 'new' ? 'new' : 'mine')
      ),
    getRoot: async () => workspacesRoot(),
    pickRoot,
    moveRoot
  })
}
