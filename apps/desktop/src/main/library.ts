import { createHash } from 'crypto'
import {
  copyFileSync,
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { mkdir, rename, rm } from 'fs/promises'
import { isAbsolute, join, posix } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream } from 'stream/web'
import { PACK_FORMAT } from '@shared/packs'
import type { InstallFailure, LabSummary, PackEntry, PackIndex } from '@shared/types'
import { packVersion } from './packArchive'
import { getChapter, listLabs } from './services/packs'
import { run } from './run'

// The repo library: the content folder in user data, what the app ships into it and what is
// downloaded into it. No Electron here, so all of it runs in tests on real folders.

const INDEX_TIMEOUT_MS = 8000
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000

const MESSAGES: Record<InstallFailure, string> = {
  offline: "Can't reach the repo library. Check your connection.",
  missing: 'This repo is no longer available.',
  damaged: 'The download was damaged on the way. Try again.',
  'no-space': 'Not enough free space.',
  broken: "This repo's files look broken.",
  'too-new': 'This repo needs a newer version of Indent.'
}

export class InstallError extends Error {
  constructor(readonly reason: InstallFailure) {
    super(MESSAGES[reason])
  }
}

export function asInstallError(error: unknown): InstallError {
  if (error instanceof InstallError) return error
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return new InstallError(code === 'ENOSPC' ? 'no-space' : 'broken')
}

const readText = (file: string): string | null => {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

/**
 * Copies what the app ships into the content folder: the kit, the runtime and the roadmaps each
 * time the app version changes, and each shipped repo that is not there yet. A repo already on
 * disk may be a newer download, so it is never replaced here.
 */
export function seedContent(bundled: string, root: string, appVersion: string): void {
  const marker = join(root, '.app-version')
  if (readText(marker) === appVersion) return
  mkdirSync(join(root, 'labs'), { recursive: true })
  for (const name of ['kit', 'runtime']) {
    rmSync(join(root, name), { recursive: true, force: true })
    cpSync(join(bundled, name), join(root, name), { recursive: true })
  }
  for (const name of ['paths.json', 'package.json']) {
    if (existsSync(join(bundled, name))) copyFileSync(join(bundled, name), join(root, name))
  }
  if (!existsSync(join(root, 'index.json')) && existsSync(join(bundled, 'index.json'))) {
    copyFileSync(join(bundled, 'index.json'), join(root, 'index.json'))
  }
  for (const id of labFolders(join(bundled, 'labs'))) {
    const target = join(root, 'labs', id)
    if (!existsSync(target)) cpSync(join(bundled, 'labs', id), target, { recursive: true })
  }
  writeFileSync(marker, appVersion)
}

function labFolders(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

const SAFE_ID = /^[a-z0-9][a-z0-9-_]*$/i
const SAFE_FILE = /^[a-z0-9][a-z0-9-_.]*$/i

/** The index is read from the network, so every id and file name is checked before use. */
export function parseIndex(text: string): PackIndex {
  const index = JSON.parse(text) as PackIndex
  if (!Array.isArray(index?.labs) || !Array.isArray(index.paths)) {
    throw new Error('Not a repo library index')
  }
  for (const entry of index.labs) {
    const ok =
      SAFE_ID.test(entry.id) &&
      SAFE_FILE.test(entry.file) &&
      (entry.cover === undefined || SAFE_FILE.test(entry.cover)) &&
      typeof entry.version === 'string' &&
      typeof entry.sha256 === 'string' &&
      Number.isFinite(entry.size) &&
      Number.isFinite(entry.format) &&
      typeof entry.summary === 'object'
    if (!ok) throw new Error(`Bad entry in the repo library index: ${JSON.stringify(entry.id)}`)
  }
  return index
}

export function readIndexFile(file: string): PackIndex | null {
  const text = readText(file)
  try {
    return text ? parseIndex(text) : null
  } catch {
    return null
  }
}

/** The index text, checked; throws when the library cannot be reached or sent something else. */
export async function fetchIndex(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/index.json`, {
    signal: AbortSignal.timeout(INDEX_TIMEOUT_MS)
  })
  if (!response.ok) throw new Error(`The repo library answered ${response.status}`)
  const text = await response.text()
  parseIndex(text)
  return text
}

/** Repos on disk, then the ones only the library has. */
export async function listAll(root: string, index: PackIndex | null): Promise<LabSummary[]> {
  const installed = await listLabs(root)
  const have = new Set(installed.map((lab) => lab.id))
  const remote: LabSummary[] = (index?.labs ?? [])
    .filter((entry) => !have.has(entry.id))
    .map((entry) => ({
      ...entry.summary,
      id: entry.id,
      availability: entry.format > PACK_FORMAT ? 'app-update' : 'download'
    }))
  return [...installed, ...remote].sort((a, b) => a.id.localeCompare(b.id))
}

const versionsFile = (root: string): string => join(root, 'versions.json')

function readVersions(root: string): Record<string, string> {
  try {
    return JSON.parse(readText(versionsFile(root)) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function recordVersion(root: string, labId: string, version: string): void {
  writeFileSync(versionsFile(root), JSON.stringify({ ...readVersions(root), [labId]: version }))
}

/** A shipped repo has no recorded version until its files are hashed once. */
function installedVersion(root: string, labId: string): string {
  const known = readVersions(root)[labId]
  if (known) return known
  const version = packVersion(join(root, 'labs', labId))
  recordVersion(root, labId, version)
  return version
}

/** Repos on disk that the library has a newer version of and that this app can run. */
export function staleRepos(index: PackIndex, root: string): PackEntry[] {
  const installed = new Set(labFolders(join(root, 'labs')))
  return index.labs.filter(
    (entry) =>
      installed.has(entry.id) &&
      entry.format <= PACK_FORMAT &&
      installedVersion(root, entry.id) !== entry.version
  )
}

export async function download(
  url: string,
  file: string,
  entry: Pick<PackEntry, 'size' | 'sha256'>,
  onProgress: (done: number) => void
): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }).catch(
    () => null
  )
  if (response?.status === 404) throw new InstallError('missing')
  if (!response?.ok || !response.body) throw new InstallError('offline')
  const hash = createHash('sha256')
  let received = 0
  try {
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream),
      async function* (chunks) {
        for await (const chunk of chunks as AsyncIterable<Buffer>) {
          received += chunk.length
          if (received > entry.size) throw new InstallError('damaged')
          hash.update(chunk)
          onProgress(received / entry.size)
          yield chunk
        }
      },
      createWriteStream(file)
    )
  } catch (error) {
    if (error instanceof InstallError || (error as NodeJS.ErrnoException).code === 'ENOSPC') {
      throw error
    }
    throw new InstallError('offline')
  }
  if (received !== entry.size || hash.digest('hex') !== entry.sha256) {
    throw new InstallError('damaged')
  }
}

const leaves = (path: string): boolean =>
  isAbsolute(path) || /^[a-z]:/i.test(path) || path.split(/[\\/]/).includes('..')

/**
 * A link entry of `tar -tv` that stays inside the archive: a symlink, `<name> -> <target>` with the
 * target relative to the link, or a hard link, `<name> link to <target>` relative to the root.
 */
function linkInside(line: string, name: string): boolean {
  const absolute = (path: string): boolean => isAbsolute(path) || /^[a-z]:/i.test(path)
  const symlink = `${name} -> `
  const hard = `${name} link to `
  if (line.startsWith('l') && line.includes(symlink)) {
    const target = line.slice(line.lastIndexOf(symlink) + symlink.length)
    return !absolute(target) && !leaves(posix.normalize(posix.join(posix.dirname(name), target)))
  }
  if (line.startsWith('h') && line.includes(hard)) {
    return !leaves(line.slice(line.lastIndexOf(hard) + hard.length))
  }
  return false
}

/**
 * Only plain files and folders, every one inside the target. With `links`, also links that point
 * inside it, which a node_modules folder has on macOS and Linux.
 */
export async function unpack(archive: string, dest: string, { links = false } = {}): Promise<void> {
  const [{ stdout: listing }, { stdout: names }] = await Promise.all([
    run('tar', ['-tvzf', archive], { maxBuffer: 64 * 1024 * 1024 }),
    run('tar', ['-tzf', archive], { maxBuffer: 64 * 1024 * 1024 })
  ])
  const lines = listing.split('\n').filter(Boolean)
  const paths = names.split('\n').filter(Boolean)
  const unsafe =
    lines.length !== paths.length ||
    paths.some(leaves) ||
    lines.some((line, i) => !/^[-d]/.test(line) && !(links && linkInside(line, paths[i])))
  if (unsafe) throw new InstallError('broken')
  await mkdir(dest, { recursive: true })
  // -m: the archive's fixed times would date every file 1970.
  await run('tar', ['-xzmf', archive, '-C', dest])
}

/** Puts `fresh` at `target`, moving what was there to `aside`, and back if the move fails. */
export async function replaceFolder(fresh: string, target: string, aside: string): Promise<void> {
  const had = existsSync(target)
  if (had) await rename(target, aside)
  try {
    await rename(fresh, target)
  } catch (error) {
    if (had) await rename(aside, target)
    throw error
  }
}

/** Every issue loads, with its lesson and its checks. `root` holds the repo in labs/<id>. */
async function verify(root: string, labId: string): Promise<void> {
  const lab = (await listLabs(root)).find((summary) => summary.id === labId)
  if (!lab) throw new InstallError('broken')
  for (const chapter of lab.chapters) {
    await getChapter(root, labId, chapter.id)
    if (!existsSync(join(root, 'labs', labId, chapter.id, 'grader', 'checks.mjs'))) {
      throw new InstallError('broken')
    }
  }
}

/**
 * Downloads a repo into the content folder. The copy on disk is replaced only once the new one
 * is complete and checked; any failure leaves it as it was.
 */
export async function installPack(
  root: string,
  baseUrl: string,
  entry: PackEntry,
  onProgress: (done: number) => void
): Promise<void> {
  if (entry.format > PACK_FORMAT) throw new InstallError('too-new')
  const work = join(root, '.download', entry.id)
  const fresh = join(work, 'labs', entry.id)
  const target = join(root, 'labs', entry.id)
  const aside = join(work, 'old')
  await rm(work, { recursive: true, force: true })
  await mkdir(join(work, 'labs'), { recursive: true })
  try {
    const archive = join(work, 'pack.tar.gz')
    await download(`${baseUrl}/${entry.file}`, archive, entry, onProgress)
    await unpack(archive, fresh)
    await verify(work, entry.id)
    await mkdir(join(root, 'labs'), { recursive: true })
    await replaceFolder(fresh, target, aside)
    recordVersion(root, entry.id, entry.version)
  } catch (error) {
    throw asInstallError(error)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}
