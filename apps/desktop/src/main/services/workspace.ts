import { BrowserWindow, dialog } from 'electron'
import { mkdir, stat, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import {
  EVENTS,
  type FolderMove,
  type FolderMoveProgress,
  type FolderMoveResult,
  type RepoInFolder,
  type WorkspaceSnapshot
} from '@shared/types'
import { emit, handle } from '../ipc'
import {
  chapterContentDir,
  contentDir,
  earlierRoots,
  isSafeId,
  safeId,
  setWorkspacesRoot,
  workspaceDir,
  workspacesRoot
} from '../paths'
import { ensureRuntime } from './checks'
import { enterRepo, loadChapter } from './content'
import {
  bringRepoBack,
  clearIfNoWork,
  moveContents,
  moveRepos,
  planMove,
  reposIn
} from './moveFolder'
import { killAll } from './terminal'
import { holdsOtherText, isAppPath, resolveInside } from './workspaceFiles'
import { openWorkspace, resetWorkspace, resolveConflict, restoreMissing } from './workspaceSync'

const queues = new Map<string, Promise<unknown>>()

// Opens, resets, conflict choices and file operations all change the workspace; two at once
// would collide.
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
    const snapshot = await job(
      join(chapterContentDir(labId, chapterId), 'starter'),
      dir,
      chapter.files
    )
    return chapter.movesFiles ? { ...snapshot, missing: [] } : snapshot
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
  if (await holdsOtherText(file)) {
    throw new Error(`${path} is not UTF-8 text, so the editor does not save over it.`)
  }
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}

/** The last pick; moveRoot moves only there and only these repos, never a renderer's choice. */
let picked: { to: string; repos: string[] } | null = null
let moving = false

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

async function repos(root: string): Promise<RepoInFolder[]> {
  return (await reposIn(root)).filter((repo) => isSafeId(repo.labId))
}

function plainError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code
  if (code === 'EACCES' || code === 'EPERM') return 'Indent is not allowed to write there.'
  if (code === 'ENOSPC') return 'The drive is full.'
  if (code === 'EBUSY') return 'A file in it is in use by another program.'
  return error instanceof Error ? error.message : String(error)
}

/** Asks for a folder and says where the work would go. Null when the person cancels. */
async function pickRoot(): Promise<FolderMove | null> {
  if (moving) throw new Error('Your work is still moving.')
  picked = null
  const current = workspacesRoot()
  const options: Electron.OpenDialogOptions = {
    title: 'Choose a folder for your work',
    message: 'Pick an empty folder, or make a new one.',
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
  const inFolder = await repos(current)
  picked = { to: plan.to, repos: inFolder.map((repo) => repo.labId) }
  return { from: current, ...plan, repos: inFolder }
}

/** Switches to the folder the last pick approved, checked again, and moves the chosen repos. */
async function moveRoot(labIds: string[]): Promise<FolderMoveResult> {
  if (moving) throw new Error('Your work is still moving.')
  if (!picked) throw new Error('Pick a folder first.')
  const { to: next, repos: offered } = picked
  picked = null
  const chosen = offered.filter((labId) => (Array.isArray(labIds) ? labIds : []).includes(labId))
  moving = true
  try {
    const current = workspacesRoot()
    const plan = await planMove(current, next, contentDir())
    if (plan.inside || plan.to !== next) throw new Error('Pick an empty folder, or make a new one.')
    if (next === current) return { root: current, moved: [], failed: null }
    await mkdir(next, { recursive: true })
    // Shells running inside the old folder would keep it busy and lose their place.
    if (chosen.length) killAll()
    const total = chosen.length
    let sent = { at: 0, labId: '' as string | null, measuring: true }
    const { moved, failed } = chosen.length
      ? await moveRepos(current, next, chosen, (progress) => {
          // A copy reports every file; the window needs a few updates a second, and every change of step.
          const now = Date.now()
          const step = progress.labId !== sent.labId || progress.measuring !== sent.measuring
          if (!step && now - sent.at < 120) return
          sent = { at: now, labId: progress.labId, measuring: progress.measuring }
          emit(EVENTS.folderMove, { ...progress, total } satisfies FolderMoveProgress)
        }).catch((error: unknown) => {
          throw new Error(plainError(error))
        })
      : { moved: [], failed: null }
    // Nothing of the learner's is left, so the rest comes along as it always did. The repos that
    // moved are in `next` either way, so it becomes the folder even when the rest cannot follow.
    const left = await repos(current).catch(() => [{ labId: '', issues: 0 }])
    const cleared =
      !left.length &&
      (await moveContents(current, next, ['.sandbox']).then(
        () => true,
        () => false
      ))
    setWorkspacesRoot(next, cleared ? earlierRoots() : [current, ...earlierRoots()])
    return {
      root: next,
      moved,
      failed: failed && { labId: failed.labId, error: plainError(failed.error) }
    }
  } finally {
    moving = false
  }
}

async function findElsewhere(labId: string, chapterId: string): Promise<string | null> {
  if (await exists(workspaceDir(labId, chapterId))) return null
  for (const dir of earlierRoots()) {
    if (await exists(join(dir, safeId(labId), safeId(chapterId)))) return dir
  }
  return null
}

function bringBack(labId: string, chapterId: string): Promise<void> {
  return oneAtATime(workspaceDir(labId, chapterId), async () => {
    const earlier = await findElsewhere(labId, chapterId)
    if (!earlier) return
    await bringRepoBack(earlier, workspacesRoot(), safeId(labId)).catch((error: unknown) => {
      throw new Error(plainError(error))
    })
    if (await clearIfNoWork(earlier, workspacesRoot())) {
      setWorkspacesRoot(
        workspacesRoot(),
        earlierRoots().filter((dir) => dir !== earlier)
      )
    }
  })
}

export function register(): void {
  handle('workspace', {
    open: (labId, chapterId) => {
      enterRepo(labId)
      return inWorkspace(labId, chapterId, openWorkspace)
    },
    writeFile: write,
    reset: (labId, chapterId) => inWorkspace(labId, chapterId, resetWorkspace),
    restoreMissing: (labId, chapterId) => inWorkspace(labId, chapterId, restoreMissing),
    resolveConflict: (labId, chapterId, path, choice) =>
      inWorkspace(labId, chapterId, (starterDir, dir, first) =>
        resolveConflict(starterDir, dir, first, String(path), choice === 'new' ? 'new' : 'mine')
      ),
    getRoot: async () => workspacesRoot(),
    pickRoot,
    moveRoot,
    findElsewhere,
    bringBack
  })
}
