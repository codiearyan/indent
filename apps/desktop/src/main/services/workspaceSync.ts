import { existsSync } from 'fs'
import { copyFile, mkdir, readFile, rm, rmdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { ConflictChoice, WorkspaceSnapshot } from '@shared/types'
import { planMerge, type Files } from './mergeStarter'
import {
  APP_DIR,
  copyStarter,
  emptyDir,
  isAppPath,
  readFolders,
  readWorkspace,
  resolveInside,
  unlock
} from './workspaceFiles'

// Kept as one file, not a copy of the starter tree, so test runners and type checks in the
// workspace never pick up a second set of starter files.
const rememberedFile = (dir: string): string => join(dir, APP_DIR, 'starter.json')

// Something that is not a readable file sits where a starter file goes; it must never match.
const UNREADABLE = '\0'

function isSafePath(dir: string, path: string): boolean {
  try {
    return !isAppPath(dir, resolveInside(dir, path))
  } catch {
    return false
  }
}

/** The starter this workspace was given, or null for a workspace from before it was kept. */
async function readRemembered(dir: string): Promise<Files | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(rememberedFile(dir), 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && isSafePath(dir, entry[0])
    )
    return Object.fromEntries(entries)
  } catch {
    return null
  }
}

async function remember(dir: string, starter: Files): Promise<void> {
  await mkdir(join(dir, APP_DIR), { recursive: true })
  await writeFile(rememberedFile(dir), JSON.stringify(starter, null, 2))
}

async function readStarter(starterDir: string, first: string[]): Promise<Files> {
  if (!existsSync(starterDir)) return {}
  const files = await readWorkspace(starterDir, first)
  return Object.fromEntries(files.map((f) => [f.path, f.content]))
}

async function readMine(dir: string, paths: string[]): Promise<Files> {
  const mine: Files = {}
  for (const path of paths) {
    try {
      mine[path] = await readFile(resolveInside(dir, path), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') mine[path] = UNREADABLE
    }
  }
  return mine
}

async function takeFromStarter(starterDir: string, dir: string, path: string): Promise<void> {
  const file = resolveInside(dir, path)
  await mkdir(dirname(file), { recursive: true })
  await unlock(file)
  await copyFile(resolveInside(starterDir, path), file)
}

/** Removes a file and the folders it leaves empty, never the workspace itself. */
async function removeFile(dir: string, path: string): Promise<void> {
  const file = resolveInside(dir, path)
  await rm(file, { force: true })
  for (let parent = dirname(file); parent !== dir; parent = dirname(parent)) {
    try {
      await rmdir(parent)
    } catch {
      break
    }
  }
}

const missingFiles = (dir: string, starter: Files): string[] =>
  Object.keys(starter)
    .filter((path) => !existsSync(resolveInside(dir, path)))
    .sort()

const sameFiles = (a: Files, b: Files): boolean =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((path) => Object.hasOwn(b, path) && a[path] === b[path])

async function snapshot(
  dir: string,
  first: string[],
  starter: Files,
  remembered = true,
  conflicts: string[] = [],
  updated: string[] = []
): Promise<WorkspaceSnapshot> {
  const [files, folders] = await Promise.all([readWorkspace(dir, first), readFolders(dir)])
  const missing = missingFiles(dir, starter)
  return { dir, files, folders, starter, conflicts, updated, remembered, missing }
}

/** Starter files that are gone from the workspace, deleted or renamed by the learner. */
export async function findMissing(
  starterDir: string,
  dir: string,
  first: string[]
): Promise<string[]> {
  return missingFiles(dir, (await readRemembered(dir)) ?? (await readStarter(starterDir, first)))
}

/**
 * Creates the workspace from the starter on first open. Later opens bring in what the repo
 * changed since the starter this workspace was given, without touching what the learner changed.
 */
export async function openWorkspace(
  starterDir: string,
  dir: string,
  first: string[]
): Promise<WorkspaceSnapshot> {
  const next = await readStarter(starterDir, first)
  if (!existsSync(dir)) {
    await copyStarter(starterDir, dir)
    await remember(dir, next)
    return snapshot(dir, first, next)
  }
  const old = await readRemembered(dir)
  if (!old) return snapshot(dir, first, next, false)
  if (sameFiles(old, next)) return snapshot(dir, first, old)
  const paths = [...new Set([...Object.keys(old), ...Object.keys(next)])]
  const plan = planMerge(old, next, await readMine(dir, paths))
  for (const path of plan.writes) await takeFromStarter(starterDir, dir, path)
  for (const path of plan.deletes) await removeFile(dir, path)
  await remember(dir, plan.starter)
  return snapshot(dir, first, plan.starter, true, plan.conflicts, [...plan.writes, ...plan.deletes])
}

/**
 * Rewrites every starter file and removes the ones the repo no longer has. Files the learner
 * added stay. A workspace with no remembered starter cannot tell those apart, so it is emptied.
 */
export async function resetWorkspace(
  starterDir: string,
  dir: string,
  first: string[]
): Promise<WorkspaceSnapshot> {
  const old = await readRemembered(dir)
  const next = await readStarter(starterDir, first)
  await unlock(dir)
  if (!old) await emptyDir(dir)
  else {
    for (const path of Object.keys(old)) {
      if (!Object.hasOwn(next, path)) await removeFile(dir, path)
    }
  }
  await copyStarter(starterDir, dir)
  await remember(dir, next)
  return snapshot(dir, first, next)
}

/** Copies back only the starter files that are gone. Edited and added files stay as they are. */
export async function restoreMissing(
  starterDir: string,
  dir: string,
  first: string[]
): Promise<WorkspaceSnapshot> {
  for (const path of missingFiles(dir, await readStarter(starterDir, first))) {
    await takeFromStarter(starterDir, dir, path)
  }
  return openWorkspace(starterDir, dir, first)
}

/**
 * Settles one conflicted file. `mine` keeps the learner's file and takes the new starter as its
 * base. `new` replaces the learner's file with the new version.
 */
export async function resolveConflict(
  starterDir: string,
  dir: string,
  first: string[],
  path: string,
  choice: ConflictChoice
): Promise<WorkspaceSnapshot> {
  if (!isSafePath(dir, path)) throw new Error(`Not a file of this issue: ${path}`)
  const old = await readRemembered(dir)
  const next = await readStarter(starterDir, first)
  const mine = await readMine(dir, [path])
  const pick = (files: Files | null): Files =>
    files && Object.hasOwn(files, path) ? { [path]: files[path] } : {}
  if (!old || !planMerge(pick(old), pick(next), mine).conflicts.includes(path)) {
    throw new Error('This file has no new version to choose.')
  }
  if (choice === 'new') {
    if (Object.hasOwn(next, path)) await takeFromStarter(starterDir, dir, path)
    else await removeFile(dir, path)
  }
  const starter = { ...old }
  if (Object.hasOwn(next, path)) starter[path] = next[path]
  else delete starter[path]
  await remember(dir, starter)
  return openWorkspace(starterDir, dir, first)
}
