import { cp, mkdir, readdir, rename, rm } from 'fs/promises'
import { join, relative, isAbsolute } from 'path'

const IGNORED = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

export function isInsideOrSame(dir: string, parent: string): boolean {
  const rel = relative(parent, dir)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** True when the folder is missing or holds nothing but system files. */
export async function isEmptyFolder(dir: string): Promise<boolean> {
  const entries = await readdir(dir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  return entries.every((name) => IGNORED.has(name))
}

/**
 * Moves everything in `from` into `to`, then removes `from`. Entries named in `skip` are deleted
 * instead of moved. Another drive cannot take a rename, so those entries are copied, then removed.
 */
export async function moveContents(from: string, to: string, skip: string[] = []): Promise<void> {
  await mkdir(to, { recursive: true })
  const entries = await readdir(from).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  for (const name of entries) {
    if (skip.includes(name) || IGNORED.has(name)) continue
    const source = join(from, name)
    const target = join(to, name)
    try {
      await rename(source, target)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
      await cp(source, target, { recursive: true, verbatimSymlinks: true, errorOnExist: true })
      await rm(source, { recursive: true, force: true })
    }
  }
  await rm(from, { recursive: true, force: true })
}
