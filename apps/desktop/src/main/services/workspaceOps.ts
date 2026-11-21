import { lstat, mkdir, rename, rm, writeFile } from 'fs/promises'
import { dirname, relative } from 'path'
import { pathProblem } from '../../shared/fileNames'
import { isAppPath, resolveInside } from './workspaceFiles'

/** A renderer path to a learner's file or folder; never the workspace itself or the app folder. */
function target(dir: string, path: string): string {
  const problem = pathProblem(path)
  if (problem) throw new Error(problem)
  const full = resolveInside(dir, path)
  if (isAppPath(dir, full)) throw new Error(`Path outside workspace: ${path}`)
  return full
}

async function exists(file: string): Promise<boolean> {
  try {
    await lstat(file)
    return true
  } catch {
    return false
  }
}

async function mustBeFree(file: string, path: string): Promise<void> {
  if (await exists(file)) throw new Error(`${path} already exists.`)
}

async function mustExist(file: string, path: string): Promise<void> {
  if (!(await exists(file))) throw new Error(`${path} is not there any more.`)
}

export async function createFile(dir: string, path: string): Promise<void> {
  const file = target(dir, path)
  await mustBeFree(file, path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, '', { flag: 'wx' })
}

export async function createFolder(dir: string, path: string): Promise<void> {
  const folder = target(dir, path)
  await mustBeFree(folder, path)
  await mkdir(dirname(folder), { recursive: true })
  await mkdir(folder)
}

/** Renames or moves a file or a folder with what is in it. */
export async function renamePath(dir: string, from: string, to: string): Promise<void> {
  const source = target(dir, from)
  const destination = target(dir, to)
  await mustExist(source, from)
  if (source === destination) return
  if (!relative(source, destination).startsWith('..')) {
    throw new Error("A folder can't move inside itself.")
  }
  // On a disk that ignores case, a.js and A.js are one file: changing the case is a rename.
  if (source.toLowerCase() !== destination.toLowerCase()) await mustBeFree(destination, to)
  await mkdir(dirname(destination), { recursive: true })
  await rename(source, destination)
}

/** Deletes a file, or a folder with everything in it. */
export async function removePath(dir: string, path: string): Promise<void> {
  const file = target(dir, path)
  await mustExist(file, path)
  await rm(file, { recursive: true, force: true })
}
