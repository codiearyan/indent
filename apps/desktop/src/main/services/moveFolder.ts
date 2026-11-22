import { cp, lstat, mkdir, readdir, rename, rm, rmdir, stat } from 'fs/promises'
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
 * Moves the entries `names` of `from` into `to`, all or none. Another drive cannot take a rename,
 * so those entries are copied and their originals removed only once every entry has arrived. If
 * any entry fails, everything already moved goes back and the copies are deleted, so the work
 * stays whole in `from`.
 */
export async function moveEntries(
  from: string,
  to: string,
  names: string[],
  onCopied: (bytes: number) => void = () => {}
): Promise<void> {
  await mkdir(to, { recursive: true })
  const renamed: string[] = []
  const copied: string[] = []
  let copying: string | null = null
  try {
    for (const name of names) {
      try {
        await rename(join(from, name), join(to, name))
        renamed.push(name)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
        copying = name
        await cp(join(from, name), join(to, name), {
          recursive: true,
          verbatimSymlinks: true,
          errorOnExist: true,
          // Called before each entry is copied: the one place a copy tells how far it is.
          filter: async (source) => {
            const info = await lstat(source)
            if (info.isFile()) onCopied(info.size)
            return true
          }
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
}

/** The entries of a folder, without system files; none when the folder is missing. */
export async function entriesOf(dir: string): Promise<string[]> {
  const entries = await readdir(dir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  return entries.filter((name) => !IGNORED.has(name))
}

/** Moves everything in `from` into `to`, then removes `from`. Entries in `skip` are deleted. */
export async function moveContents(from: string, to: string, skip: string[] = []): Promise<void> {
  const names = (await entriesOf(from)).filter((name) => !skip.includes(name))
  await moveEntries(from, to, names)
  await rm(from, { recursive: true, force: true })
}

/** The repo tools at the top of the work folder. They move with the first repo that moves. */
export const RUNTIME_ENTRIES = [
  'node_modules',
  'package.json',
  'package-lock.json',
  '.tools-version'
]

async function folders(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    }
  )
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

/** Each repo with work in `root` and how many issue workspaces it holds. */
export async function reposIn(root: string): Promise<{ labId: string; issues: number }[]> {
  const labs = (await folders(root)).filter(
    (name) => !name.startsWith('.') && name !== 'node_modules'
  )
  const repos = await Promise.all(
    labs.map(async (labId) => ({ labId, issues: (await folders(join(root, labId))).length }))
  )
  return repos.filter((repo) => repo.issues > 0)
}

/** Bytes of the files under `path`, links not followed. */
export async function sizeOf(path: string): Promise<number> {
  const info = await lstat(path).catch(() => null)
  if (!info) return 0
  if (!info.isDirectory()) return info.isFile() ? info.size : 0
  const sizes = await Promise.all((await readdir(path)).map((name) => sizeOf(join(path, name))))
  return sizes.reduce((sum, size) => sum + size, 0)
}

export interface RepoMoveProgress {
  /** The repo moving now; null while measuring and while the repo tools move. */
  labId: string | null
  /** Repos already moved. */
  done: number
  measuring: boolean
  /** Bytes copied so far and in all; both 0 on the same drive, where a move is a quick rename. */
  bytes: number
  totalBytes: number
}

/**
 * Moves the repo tools and then the repos `labIds` from `from` to `to`, each repo whole or not at
 * all. Stops at the first repo that fails: the repos before it are in `to`, it and the rest stay
 * in `from`. A failure to move the tools moves nothing. Onto another drive the files are copied,
 * so their size is measured first to report progress in bytes.
 */
export async function moveRepos(
  from: string,
  to: string,
  labIds: string[],
  onProgress: (progress: RepoMoveProgress) => void = () => {}
): Promise<{ moved: string[]; failed: { labId: string; error: unknown } | null }> {
  await mkdir(to, { recursive: true })
  const present = await entriesOf(from)
  const tools = RUNTIME_ENTRIES.filter((name) => present.includes(name))
  const copying = (await stat(from)).dev !== (await stat(to)).dev
  const progress: RepoMoveProgress = {
    labId: null,
    done: 0,
    measuring: copying,
    bytes: 0,
    totalBytes: 0
  }
  onProgress({ ...progress })
  if (copying) {
    const sizes = await Promise.all([...tools, ...labIds].map((name) => sizeOf(join(from, name))))
    progress.totalBytes = sizes.reduce((sum, size) => sum + size, 0)
    progress.measuring = false
    onProgress({ ...progress })
  }
  const onCopied = (bytes: number): void => {
    progress.bytes = Math.min(progress.bytes + bytes, progress.totalBytes)
    onProgress({ ...progress })
  }
  await moveEntries(from, to, tools, onCopied)
  const moved: string[] = []
  for (const labId of labIds) {
    progress.labId = labId
    progress.done = moved.length
    onProgress({ ...progress })
    try {
      await moveEntries(from, to, [labId], onCopied)
      moved.push(labId)
    } catch (error) {
      return { moved, failed: { labId, error } }
    }
  }
  return { moved, failed: null }
}

/**
 * Moves the issue workspaces of a repo from an earlier folder into the current one. An issue that
 * already has a workspace here keeps it, and its earlier copy stays where it is.
 */
export async function bringRepoBack(
  earlier: string,
  current: string,
  labId: string
): Promise<void> {
  const here = await folders(join(current, labId))
  const issues = (await folders(join(earlier, labId))).filter((name) => !here.includes(name))
  await moveEntries(join(earlier, labId), join(current, labId), issues)
  await rmdir(join(earlier, labId)).catch(() => {})
}

/**
 * Removes the repo tools of a folder with no repos left, and the folder once it is empty. When
 * `current` has no repo tools of its own, they move there instead, so nothing downloads again.
 */
export async function clearIfNoWork(dir: string, current: string): Promise<boolean> {
  if ((await reposIn(dir)).length) return false
  const here = await entriesOf(current)
  if (!here.includes('node_modules')) {
    const there = await entriesOf(dir)
    const tools = RUNTIME_ENTRIES.filter((name) => there.includes(name) && !here.includes(name))
    await moveEntries(dir, current, tools).catch(() => {})
  }
  for (const name of [...RUNTIME_ENTRIES, '.sandbox']) {
    await rm(join(dir, name), { recursive: true, force: true })
  }
  await rmdir(dir).catch(() => {})
  return true
}
