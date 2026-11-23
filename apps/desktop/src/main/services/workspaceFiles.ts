import { chmod, cp, lstat, mkdir, readdir, readFile, rm, stat } from 'fs/promises'
import { isUtf8 } from 'buffer'
import { existsSync } from 'fs'
import ignore from 'ignore'
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

/** True when the file on disk is not UTF-8 text, so writing the editor's text over it would damage it. */
export async function holdsOtherText(file: string): Promise<boolean> {
  const buffer = await readFile(file).catch(() => null)
  return !!buffer && !isUtf8(buffer)
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

interface Found {
  files: string[]
  folders: string[]
}

/**
 * What the workspace's own `.gitignore` leaves out, such as the `dist/` and `coverage/` a build or
 * a test run makes, so the editor never loads them. A file in `kept` and the folders above it
 * always show: an ignore rule must not hide what the learner works on.
 */
async function ignoredBy(
  dir: string,
  kept: string[]
): Promise<(path: string, folder: boolean) => boolean> {
  const text = await readFile(join(dir, '.gitignore'), 'utf8').catch(() => '')
  if (!text.trim()) return () => false
  const rules = ignore().add(text)
  return (path, folder) =>
    folder
      ? !kept.some((file) => file.startsWith(`${path}/`)) && rules.ignores(`${path}/`)
      : !kept.includes(path) && rules.ignores(path)
}

async function walk(
  dir: string,
  listed: string[],
  ignored: (path: string, folder: boolean) => boolean,
  prefix: string,
  found: Found
): Promise<void> {
  const folders: string[] = []
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    // A dot file shows only when the issue lists it (.gitignore); a dot folder never does.
    const shown = !entry.name.startsWith('.') || (entry.isFile() && listed.includes(path))
    if (!shown || entry.name === 'node_modules') continue
    if (entry.isDirectory()) {
      if (!ignored(path, true)) folders.push(path)
    } else if (entry.isFile() && !ignored(path, false)) found.files.push(path)
  }
  found.folders.push(...folders)
  // A folder the learner locked is listed, with nothing in it.
  await Promise.all(folders.map((path) => walk(dir, listed, ignored, path, found).catch(() => {})))
}

async function listEntries(dir: string, listed: string[], kept: string[]): Promise<Found> {
  const found: Found = { files: [], folders: [] }
  await walk(dir, listed, await ignoredBy(dir, [...listed, ...kept]), '', found)
  return found
}

/** Folders of the workspace, left out as `readWorkspace` leaves them out. */
export async function readFolders(dir: string, kept: string[] = []): Promise<string[]> {
  return (await listEntries(dir, [], kept)).folders.sort()
}

/**
 * Text files of the workspace, `first` (the chapter's tab order) leading, the rest alphabetical.
 * A file whose name starts with a dot is read only when `first` names it. What the workspace's
 * `.gitignore` names is left out, unless `first` or `kept` names it.
 */
export async function readWorkspace(
  dir: string,
  first: string[],
  kept: string[] = []
): Promise<WorkspaceFile[]> {
  const read = await Promise.all(
    (await listEntries(dir, first, kept)).files.map(async (path): Promise<WorkspaceFile | null> => {
      const full = join(dir, ...path.split('/'))
      const size = await stat(full).then(
        (info) => info.size,
        () => Infinity
      )
      if (size > MAX_FILE_BYTES) return null
      // A file the learner locked is left out, as a binary one is, so the issue still opens.
      const buffer = await readFile(full).catch(() => null)
      if (!buffer || buffer.includes(0)) return null
      return isUtf8(buffer)
        ? { path, content: buffer.toString('utf8') }
        : { path, content: buffer.toString('utf8'), readOnly: true }
    })
  )
  const files = read.filter((file): file is WorkspaceFile => file !== null)
  const rank = (path: string): number => {
    const index = first.indexOf(path)
    return index === -1 ? first.length : index
  }
  return files.sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path))
}
