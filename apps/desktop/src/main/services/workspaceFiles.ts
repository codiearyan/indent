import { cp, mkdir, readdir, readFile, rm, stat } from 'fs/promises'
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

/** The app's own folder in each workspace: the starter the learner was given, and backups. */
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

async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await listFiles(dir, path)))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

/** Text files of the workspace, `first` (the chapter's tab order) leading, the rest alphabetical. */
export async function readWorkspace(dir: string, first: string[]): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = []
  for (const path of await listFiles(dir)) {
    const full = join(dir, ...path.split('/'))
    if ((await stat(full)).size > MAX_FILE_BYTES) continue
    const buffer = await readFile(full)
    if (buffer.includes(0)) continue
    files.push({ path, content: buffer.toString('utf8') })
  }
  const rank = (path: string): number => {
    const index = first.indexOf(path)
    return index === -1 ? first.length : index
  }
  return files.sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path))
}
