import { BrowserWindow, dialog } from 'electron'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import type { WorkspaceSnapshot } from '@shared/types'
import { handle } from '../ipc'
import {
  chapterContentDir,
  contentDir,
  setWorkspacesRoot,
  workspaceDir,
  workspacesRoot
} from '../paths'
import { loadChapter } from './content'
import { isEmptyFolder, isInsideOrSame, moveContents } from './moveFolder'
import { killAll } from './terminal'
import { copyStarter, emptyDir, readWorkspace, resolveInside } from './workspaceFiles'

const queues = new Map<string, Promise<unknown>>()

// Two opens of the same new workspace would both copy the starter files and collide.
function oneAtATime<T>(key: string, job: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).then(job, job)
  queues.set(
    key,
    result.catch(() => {})
  )
  return result
}

function open(labId: string, chapterId: string, reset = false): Promise<WorkspaceSnapshot> {
  const dir = workspaceDir(labId, chapterId)
  return oneAtATime(dir, async () => {
    const chapter = await loadChapter(labId, chapterId)
    const starterDir = join(chapterContentDir(labId, chapterId), 'starter')
    if (reset) await emptyDir(dir)
    if (reset || !existsSync(dir)) await copyStarter(starterDir, dir)
    const starter = existsSync(starterDir) ? await readWorkspace(starterDir, []) : []
    return {
      dir,
      files: await readWorkspace(dir, chapter.files),
      starter: Object.fromEntries(starter.map((f) => [f.path, f.content]))
    }
  })
}

async function write(
  labId: string,
  chapterId: string,
  path: string,
  content: string
): Promise<void> {
  const file = resolveInside(workspaceDir(labId, chapterId), path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}

/** Asks for a new folder and moves all work there. Null when the person cancels. */
async function chooseRoot(): Promise<string | null> {
  const current = workspacesRoot()
  const options: Electron.OpenDialogOptions = {
    title: 'Choose a folder for your work',
    buttonLabel: 'Use this folder',
    defaultPath: dirname(current),
    properties: ['openDirectory', 'createDirectory']
  }
  const window = BrowserWindow.getFocusedWindow()
  const picked = await (window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options))
  if (picked.canceled || !picked.filePaths[0]) return null
  const next = resolve(picked.filePaths[0])
  if (next === current) return current
  if (isInsideOrSame(next, current) || isInsideOrSame(current, next)) {
    throw new Error('Pick a folder that is not inside the current one, and does not hold it.')
  }
  if (isInsideOrSame(next, contentDir())) throw new Error('Pick a folder outside the app.')
  if (!(await isEmptyFolder(next))) throw new Error('Pick an empty folder, or make a new one.')
  // Shells running inside the old folder would keep it busy and lose their place.
  killAll()
  await moveContents(current, next, ['.sandbox'])
  setWorkspacesRoot(next)
  return next
}

export function register(): void {
  handle('workspace', {
    open: (labId, chapterId) => open(labId, chapterId),
    writeFile: write,
    reset: (labId, chapterId) => open(labId, chapterId, true),
    getRoot: async () => workspacesRoot(),
    chooseRoot
  })
}
