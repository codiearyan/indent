import { net, protocol } from 'electron'
import { existsSync } from 'fs'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { COVER_SCHEME } from '@shared/cover'
import { checkFlow } from '@shared/flow'
import { PACKS_URL } from '@shared/packs'
import type { Chapter, Flow, InstallResult, LabSummary, PackIndex, PathDef } from '@shared/types'
import { EVENTS } from '@shared/types'
import { emit, handle } from '../ipc'
import {
  asInstallError,
  fetchIndex,
  InstallError,
  installPack,
  listAll,
  parseIndex,
  readIndexFile,
  staleRepos
} from '../library'
import { chapterContentDir, contentDir, safeId, usesLibrary } from '../paths'
import { reloadLabModel } from './labModel'
import { getChapter, listPaths } from './packs'

const packsUrl = (): string => process.env.INDENT_PACKS_URL ?? PACKS_URL
const indexFile = (): string => join(contentDir(), 'index.json')

let index: PackIndex | null | undefined
const cachedIndex = (): PackIndex | null => (index ??= readIndexFile(indexFile()))

/** The repo last opened in the workspace; quiet updates leave it alone. */
let openLabId: string | undefined

const installs = new Map<string, Promise<void>>()

/** One download per repo at a time; a second call joins the first. */
function installRepo(labId: string, retried = false): Promise<void> {
  safeId(labId)
  const running = installs.get(labId)
  if (running) return running
  const job = (async () => {
    const entry = cachedIndex()?.labs.find((candidate) => candidate.id === labId)
    if (!entry) throw new InstallError('missing')
    await installPack(contentDir(), packsUrl(), entry, (done) =>
      emit(EVENTS.contentInstall, labId, done)
    )
    if (existsSync(join(contentDir(), 'labs', labId, 'model.mjs'))) await reloadLabModel()
  })().finally(() => installs.delete(labId))
  installs.set(labId, job)
  // An index from before the last site deploy can name an archive that is gone.
  return retried
    ? job
    : job.catch(async (error) => {
        if (!(error instanceof InstallError && error.reason === 'missing')) throw error
        if (!(await refreshIndex())) throw error
        return installRepo(labId, true)
      })
}

async function install(labId: string): Promise<InstallResult> {
  try {
    await installRepo(labId)
    emit(EVENTS.contentChanged)
    return { ok: true }
  } catch (error) {
    const { reason, message } = asInstallError(error)
    return { ok: false, reason, message }
  }
}

/** Fetches the index and keeps it when it changed; false when the library could not be reached. */
async function refreshIndex(): Promise<boolean> {
  try {
    const text = await fetchIndex(packsUrl())
    if (text !== (await readFile(indexFile(), 'utf8').catch(() => ''))) {
      await writeFile(`${indexFile()}.tmp`, text)
      await rename(`${indexFile()}.tmp`, indexFile())
      index = parseIndex(text)
      emit(EVENTS.contentChanged)
    }
    return true
  } catch (error) {
    console.warn('Could not reach the repo library:', (error as Error).message)
    return false
  }
}

let refreshed = false

/** Once a run: a fresh index, then newer versions of repos on disk, one at a time. */
async function refreshLibrary(): Promise<void> {
  if (!usesLibrary() || refreshed) return
  refreshed = true
  if (!(await refreshIndex())) {
    refreshed = false
    return
  }
  const current = cachedIndex()
  if (!current) return
  for (const entry of staleRepos(current, contentDir())) {
    // Checked at each turn: the learner may open a repo while an earlier one downloads.
    if (entry.id === openLabId) continue
    try {
      await installRepo(entry.id)
      emit(EVENTS.contentChanged)
    } catch (error) {
      console.warn(`Could not update ${entry.id}:`, (error as Error).message)
    }
  }
}

/** A flow.json that fails its checks is left out, so the repo and the issue still open. */
async function readFlow(
  dir: string,
  name: string,
  taskIds: string[] | null
): Promise<Flow | undefined> {
  const text = await readFile(join(dir, 'flow.json'), 'utf8').catch(() => undefined)
  if (text === undefined) return undefined
  const { flow, problems } = checkFlow(text, `${name}/flow.json`, taskIds)
  if (problems.length) console.warn(`Leaving out a flow:\n  ${problems.join('\n  ')}`)
  return flow ?? undefined
}

async function listRepos(): Promise<LabSummary[]> {
  void refreshLibrary()
  const labs = await listAll(contentDir(), cachedIndex())
  return Promise.all(
    labs.map(async (lab) => {
      if (lab.availability) return lab
      const flow = await readFlow(join(contentDir(), 'labs', lab.id), lab.id, null)
      return flow ? { ...lab, scene: flow.scene } : lab
    })
  )
}

async function listRoadmaps(): Promise<PathDef[]> {
  return cachedIndex()?.paths ?? listPaths(contentDir())
}

/** Downloads the repo first when only the library has it. */
export async function loadChapter(labId: string, chapterId: string): Promise<Chapter> {
  safeId(labId)
  openLabId = labId
  await installs.get(labId)?.catch(() => {})
  if (usesLibrary() && !existsSync(join(contentDir(), 'labs', labId, 'lab.json'))) {
    await installRepo(labId)
    emit(EVENTS.contentChanged)
  }
  return getChapter(contentDir(), labId, safeId(chapterId))
}

/** The chapter with its flow, when the flow passes the checks in flow.ts. */
export async function openChapter(labId: string, chapterId: string): Promise<Chapter> {
  const chapter = await loadChapter(labId, chapterId)
  const taskIds = chapter.tasks.map((task) => task.id)
  const flow = await readFlow(chapterContentDir(labId, chapterId), `${labId}/${chapterId}`, taskIds)
  return flow ? { ...chapter, flow } : chapter
}

/** A recording exists only for the exact text it was made from, so the key is its file name. */
async function narration(
  labId: string,
  chapterId: string,
  key: string
): Promise<Uint8Array | null> {
  if (!/^[0-9a-f]{8}$/.test(key)) throw new Error(`Invalid narration key: ${key}`)
  return readFile(join(chapterContentDir(labId, chapterId), 'audio', `${key}.ogg`)).catch(
    () => null
  )
}

/** The repo's own cover, or the library's copy for a repo not downloaded yet, kept once fetched. */
async function coverFile(labId: string): Promise<string | null> {
  const local = join(contentDir(), 'labs', labId, 'cover.webp')
  if (existsSync(local)) return local
  const name = cachedIndex()?.labs.find((entry) => entry.id === labId)?.cover
  if (!name) return null
  const kept = join(contentDir(), '.covers', name)
  if (!existsSync(kept)) {
    const response = await fetch(`${packsUrl()}/${name}`, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    await mkdir(join(contentDir(), '.covers'), { recursive: true })
    await writeFile(kept, Buffer.from(await response.arrayBuffer()))
  }
  return kept
}

export function register(): void {
  protocol.handle(COVER_SCHEME, async (request) => {
    try {
      const file = await coverFile(safeId(new URL(request.url).hostname))
      if (file) return await net.fetch(pathToFileURL(file).toString())
    } catch {
      // Falls through to not found; the card then shows the repo's language.
    }
    return new Response('Not found', { status: 404 })
  })
  handle('content', {
    listLabs: listRepos,
    getChapter: openChapter,
    listPaths: listRoadmaps,
    narration,
    install
  })
}
