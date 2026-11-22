import { app } from 'electron'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { isAbsolute, join } from 'path'

/** What the app ships: packages/content in dev, an extra resource when packaged. */
export function bundledContentDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'content')
    : join(app.getAppPath(), '..', '..', 'packages', 'content')
}

/** Repos come from the library when packaged, and in dev when INDENT_PACKS_URL names one. */
export function usesLibrary(): boolean {
  return app.isPackaged || !!process.env.INDENT_PACKS_URL
}

/**
 * Where every service reads repos, the kit and the runtime. With the library it is a folder in
 * user data that the shipped content is copied into and downloads add to; dev reads packages/content.
 */
export function contentDir(): string {
  return usesLibrary() ? dataFile('content') : bundledContentDir()
}

let root: string | null = null

/** Holds learner work in a lab folder (anything but the runtime and temp folders). */
function hasWork(dir: string): boolean {
  try {
    return readdirSync(dir, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules'
    )
  } catch {
    return false
  }
}

const SYSTEM_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

/** Missing, empty, or already holding this app's runtime: safe to use without asking. */
function freeOrOurs(dir: string): boolean {
  if (!existsSync(dir)) return true
  try {
    const entries = readdirSync(dir).filter((name) => !SYSTEM_FILES.has(name))
    if (entries.length === 0) return true
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name?: unknown }
    return pkg.name === 'indent-runtime'
  } catch {
    return false
  }
}

/**
 * The folder picked for the learner's work, saved in workspace.json. Work from before the folder
 * could be picked stays in the data folder; everyone else starts in ~/Indent, or ~/Indent 2 and
 * so on when that name already holds something else.
 */
function resolveRoot(): string {
  try {
    const saved = (
      JSON.parse(readFileSync(dataFile('workspace.json'), 'utf8')) as { root?: unknown }
    ).root
    if (typeof saved === 'string' && isAbsolute(saved)) return saved
  } catch {
    // No saved folder yet.
  }
  const earlier = join(app.getPath('userData'), 'workspaces')
  const home = app.getPath('home')
  const fresh = ['Indent', ...[2, 3, 4, 5].map((n) => `Indent ${n}`)]
    .map((name) => join(home, name))
    .find(freeOrOurs)
  const chosen = hasWork(earlier) || !fresh ? earlier : fresh
  setWorkspacesRoot(chosen)
  return chosen
}

/** Parent of every learner workspace. Lab dependencies are installed here so each workspace resolves them. */
export function workspacesRoot(): string {
  root ??= resolveRoot()
  return root
}

let earlier: string[] | undefined

/** Folders that still hold work of repos the learner chose not to move, newest first. */
export function earlierRoots(): string[] {
  if (!earlier) {
    try {
      const saved = (
        JSON.parse(readFileSync(dataFile('workspace.json'), 'utf8')) as { earlier?: unknown }
      ).earlier
      earlier = Array.isArray(saved)
        ? saved.filter((dir): dir is string => typeof dir === 'string' && isAbsolute(dir))
        : []
    } catch {
      earlier = []
    }
  }
  return earlier
}

export function setWorkspacesRoot(dir: string, earlierDirs: string[] = earlierRoots()): void {
  earlier = [...new Set(earlierDirs)].filter((other) => other !== dir)
  writeFileSync(dataFile('workspace.json'), JSON.stringify({ root: dir, earlier }))
  root = dir
}

/** Tools the app downloaded for itself. Nothing outside the app looks here. */
export function toolsDir(): string {
  return join(app.getPath('userData'), 'tools')
}

/** Where the app's own copy of Node goes, and the folder inside it that holds `node`. */
export function ownNodeDir(): string {
  return join(toolsDir(), 'node')
}

export function ownNodeBin(): string {
  return process.platform === 'win32' ? ownNodeDir() : join(ownNodeDir(), 'bin')
}

/** On Windows, the folder of the `python3` the app adds when Python has only `python`. */
export function python3ShimDir(): string {
  return join(toolsDir(), 'python3')
}

/** The app's own copy of OpenCode, for learners with no AI set up; found only by the app. */
export function ownOpencodeDir(): string {
  return join(toolsDir(), 'opencode')
}

export function ownOpencodeBin(): string {
  return join(ownOpencodeDir(), process.platform === 'win32' ? 'opencode.exe' : 'opencode')
}

export function dataFile(name: string): string {
  return join(app.getPath('userData'), name)
}

/** Ids come from the renderer; reject anything that could escape its folder. */
export const isSafeId = (id: string): boolean => /^[a-z0-9][a-z0-9-_]*$/i.test(id)

export function safeId(id: string): string {
  if (!isSafeId(id)) throw new Error(`Invalid id: ${id}`)
  return id
}

export function workspaceDir(labId: string, chapterId: string): string {
  return join(workspacesRoot(), safeId(labId), safeId(chapterId))
}

export function chapterContentDir(labId: string, chapterId: string): string {
  return join(contentDir(), 'labs', safeId(labId), safeId(chapterId))
}
