import { chmod, cp, lstat, mkdir, readdir, readFile, rm, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { isAbsolute, join, relative, resolve, sep } from 'path'
import type { WorkspaceFile } from '../../shared/types'

const MAX_FILE_BYTES = 1024 * 1024

/** Resolves a renderer-supplied relative path, refusing anything outside the workspace. */
export function resolveInside(dir: string, path: string): string {
  const full = resolve(dir, path)
  const rel = relative(dir, full)
  if (!rel || rel.startsWith('..') || isAbsolute(rel))
    throw new Error(`Path outside workspace: ${path}`)
  return full
}

/** The app's own folder in each workspace: the starter the learner was given. */
export const APP_DIR = '.indent'

/** The learner's editor and pages never reach the app's own folder. */
export function isAppPath(dir: string, file: string): boolean {
  return relative(dir, file).split(sep)[0] === APP_DIR
}

export async function copyStarter(starterDir: string, dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  if (existsSync(starterDir)) await cp(starterDir, dir, { recursive: true })
}

/** Empties the folder but keeps it, so a terminal sitting in it keeps a valid cwd. */
export async function emptyDir(dir: string): Promise<void> {
  const entries = await readdir(dir).catch(() => [])
  await Promise.all(entries.map((name) => rm(join(dir, name), { recursive: true, force: true })))
}

/**
 * Gives the learner read and write again on a file, or on a folder and all it holds. A learner
 * can lock their own files (`chmod`), and a locked one cannot be replaced by the starter's.
 */
export async function unlock(path: string): Promise<void> {
  const info = await lstat(path).catch(() => null)
  if (!info || info.isSymbolicLink()) return
  const folder = info.isDirectory()
  await chmod(path, info.mode | (folder ? 0o700 : 0o600)).catch(() => {})
  if (!folder) return
  const names = await readdir(path).catch(() => [])
  await Promise.all(names.map((name) => unlock(join(path, name))))
}

async function listEntries(
  dir: string,
  listed: string[] = [],
  prefix = '',
  found: { files: string[]; folders: string[] } = { files: [], folders: [] }
): Promise<{ files: string[]; folders: string[] }> {
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    // A dot file shows only when the issue lists it (.gitignore); a dot folder never does.
    const shown = !entry.name.startsWith('.') || (entry.isFile() && listed.includes(path))
    if (!shown || entry.name === 'node_modules') continue
    if (entry.isDirectory()) {
      found.folders.push(path)
      // A folder the learner locked is listed, with nothing in it.
      await listEntries(dir, listed, path, found).catch(() => found)
    } else if (entry.isFile()) found.files.push(path)
  }
  return found
}

/** Folders of the workspace, hidden ones and `node_modules` left out, as `readWorkspace` does. */
export async function readFolders(dir: string): Promise<string[]> {
  return (await listEntries(dir)).folders.sort()
}

/**
 * Text files of the workspace, `first` (the chapter's tab order) leading, the rest alphabetical.
 * A file whose name starts with a dot is read only when `first` names it.
 */
export async function readWorkspace(dir: string, first: string[]): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = []
  for (const path of (await listEntries(dir, first)).files) {
    const full = join(dir, ...path.split('/'))
    if ((await stat(full)).size > MAX_FILE_BYTES) continue
    // A file the learner locked is left out, as a binary one is, so the issue still opens.
    const buffer = await readFile(full).catch(() => null)
    if (!buffer || buffer.includes(0)) continue
    files.push({ path, content: buffer.toString('utf8') })
  }
  const rank = (path: string): number => {
    const index = first.indexOf(path)
    return index === -1 ? first.length : index
  }
  return files.sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path))
}
