import { cp, mkdir, readdir, rename, rm } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'

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

/** A folder made inside a picked folder that already has files. */
export const NEW_FOLDER = 'indent'

/**
 * Where work goes when the person picks `picked`: the folder itself when it is empty, or a new
 * folder inside it when it has files. Throws, in words for the person, when neither can be used.
 */
export async function planMove(
  current: string,
  picked: string,
  appDir: string
): Promise<{ to: string; inside: boolean }> {
  const next = resolve(picked)
  if (next === current) return { to: current, inside: false }
  if (isInsideOrSame(next, current) || isInsideOrSame(current, next)) {
    throw new Error('Pick a folder that is not inside your current one, and does not hold it.')
  }
  if (isInsideOrSame(next, appDir)) throw new Error('Pick a folder outside the app.')
  if (await isEmptyFolder(next)) return { to: next, inside: false }
  const nested = join(next, NEW_FOLDER)
  if (!(await isEmptyFolder(nested))) {
    throw new Error(
      `This folder has files, and so does the ${NEW_FOLDER} folder inside it. Pick another folder.`
    )
  }
  return { to: nested, inside: true }
}

/**
 * Moves everything in `from` into `to`, then removes `from`. Entries named in `skip` are deleted
 * instead of moved. Another drive cannot take a rename, so those entries are copied and their
 * originals removed only once every entry has arrived. If any entry fails, everything already
 * moved goes back and the copies are deleted, so the work stays whole in `from`.
 */
export async function moveContents(from: string, to: string, skip: string[] = []): Promise<void> {
  await mkdir(to, { recursive: true })
  const entries = await readdir(from).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const renamed: string[] = []
  const copied: string[] = []
  let copying: string | null = null
  try {
    for (const name of entries) {
      if (skip.includes(name) || IGNORED.has(name)) continue
      try {
        await rename(join(from, name), join(to, name))
        renamed.push(name)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
        copying = name
        await cp(join(from, name), join(to, name), {
          recursive: true,
          verbatimSymlinks: true,
          errorOnExist: true
        })
        copied.push(name)
        copying = null
      }
    }
  } catch (error) {
    for (const name of renamed) await rename(join(to, name), join(from, name)).catch(() => {})
    for (const name of copying ? [...copied, copying] : copied) {
      await rm(join(to, name), { recursive: true, force: true }).catch(() => {})
    }
    throw error
  }
  for (const name of copied) await rm(join(from, name), { recursive: true, force: true })
  await rm(from, { recursive: true, force: true })
}
