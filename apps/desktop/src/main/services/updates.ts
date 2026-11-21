import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { app, shell } from 'electron'
import { chmodSync, copyFileSync, createWriteStream, renameSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream } from 'stream/web'
import { REPO } from '@shared/repo'
import type { UpdateStatus } from '@shared/types'
import { EVENTS } from '@shared/types'
import { emit, handle } from '../ipc'
import { assetName, isNewer, shortNotes } from '../updateRelease'
import { killAll } from './terminal'

interface Asset {
  name: string
  size: number
  digest?: string
  browser_download_url: string
}

const OFFLINE = 'Could not reach the update. Check your connection and try again.'
const DAMAGED = 'The update was damaged on the way. Try again.'

let status: UpdateStatus = { state: 'idle' }
let release: { version: string; notes: string[]; asset: Asset } | null = null
let file: string | null = null
let abort: AbortController | undefined
let installOnQuit = false

function set(next: UpdateStatus): UpdateStatus {
  status = next
  emit(EVENTS.update, next)
  return next
}

/** Reads the latest release; GitHub leaves drafts and pre-releases out of it. */
async function check(): Promise<UpdateStatus> {
  if (status.state === 'downloading' || status.state === 'ready') return status
  set({ state: 'checking' })
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Indent' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`)
    const latest = (await response.json()) as { tag_name: string; body?: string; assets: Asset[] }
    const current = app.getVersion()
    if (!isNewer(latest.tag_name, current)) return set({ state: 'current', version: current })
    const version = latest.tag_name.replace(/^v/, '')
    const name = assetName(process.platform, process.arch, !!process.env.APPIMAGE)
    const asset = latest.assets.find((candidate) => candidate.name === name)
    if (!asset) {
      return set({
        state: 'failed',
        version,
        message: 'This version has no download for this computer.'
      })
    }
    release = { version, notes: shortNotes(latest.body ?? ''), asset }
    return set({ state: 'available', version, notes: release.notes, size: asset.size })
  } catch (error) {
    console.warn('Could not check for updates:', error)
    return set({
      state: 'failed',
      message: 'Could not check for updates. Check your connection and try again.'
    })
  }
}

/** Downloads the release file for this computer and checks it against the release's checksum. */
async function download(): Promise<UpdateStatus> {
  if (status.state === 'downloading') return status
  // A newer release without this computer's file, or none read yet: look again first.
  if (!release) return check()
  const { version, notes, asset } = release
  abort = new AbortController()
  const { signal } = abort
  const dir = join(app.getPath('temp'), 'indent-update')
  const target = join(dir, asset.name)
  set({ state: 'downloading', version, done: 0, size: asset.size })
  try {
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
    const response = await fetch(asset.browser_download_url, { signal })
    if (!response.ok || !response.body) throw new Error(OFFLINE)
    const hash = createHash('sha256')
    let received = 0
    let shown = -1
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream),
      async function* (chunks) {
        for await (const chunk of chunks) {
          hash.update(chunk)
          received += chunk.length
          const percent = Math.floor((received / asset.size) * 100)
          if (percent !== shown) {
            shown = percent
            set({ state: 'downloading', version, done: received / asset.size, size: asset.size })
          }
          yield chunk
        }
      },
      createWriteStream(target),
      { signal }
    )
    if (asset.digest && asset.digest !== `sha256:${hash.digest('hex')}`) throw new Error(DAMAGED)
    file = target
    return set({ state: 'ready', version, manual: process.platform === 'darwin' })
  } catch (error) {
    if (signal.aborted) return set({ state: 'available', version, notes, size: asset.size })
    const code = (error as NodeJS.ErrnoException).code
    const message =
      code === 'ENOSPC'
        ? 'There is not enough space on this computer for the update.'
        : error instanceof Error && error.message === DAMAGED
          ? DAMAGED
          : OFFLINE
    return set({ state: 'failed', version, message })
  }
}

/**
 * Puts the downloaded update in place: the silent installer on Windows, the new AppImage on Linux.
 * Resolves once the installer has started, so a file that can't run is reported, not quit on.
 */
async function putInPlace(reopen: boolean): Promise<void> {
  if (!file) return
  if (process.platform === 'win32') {
    const args = ['/S', '--updated', ...(reopen ? ['--force-run'] : [])]
    const installer = file
    await new Promise<void>((resolve, reject) => {
      const child = spawn(installer, args, { detached: true, stdio: 'ignore' })
      child.once('error', reject)
      child.once('spawn', () => {
        child.unref()
        resolve()
      })
    })
  } else if (process.platform === 'linux' && process.env.APPIMAGE) {
    const next = `${process.env.APPIMAGE}.new`
    copyFileSync(file, next)
    chmodSync(next, 0o755)
    renameSync(next, process.env.APPIMAGE)
  }
}

/** macOS opens the installer for the person to finish; elsewhere the app updates and reopens. */
async function install(): Promise<UpdateStatus> {
  if (status.state !== 'ready' || !file) return status
  if (process.platform === 'darwin') {
    const failure = await shell.openPath(file)
    return failure ? set({ state: 'failed', version: status.version, message: OFFLINE }) : status
  }
  try {
    await putInPlace(true)
    // Shells running in the work folder would hold it open while the app is replaced.
    killAll()
  } catch (error) {
    console.error('Could not put the update in place', error)
    return set({
      state: 'failed',
      version: status.version,
      message: 'Could not replace the app here. Download it from the website.'
    })
  }
  // The Windows installer reopens the app itself; an AppImage is started again from its new file.
  if (process.platform === 'linux') {
    app.relaunch({ execPath: process.env.APPIMAGE, args: process.argv.slice(1) })
  }
  app.quit()
  return status
}

export function register(): void {
  app.on('will-quit', () => {
    if (!installOnQuit || status.state !== 'ready' || process.platform === 'darwin') return
    putInPlace(false).catch((error) =>
      console.error('Could not put the update in place on quit', error)
    )
  })
  handle('updates', {
    status: async () => status,
    check,
    download,
    cancel: async () => abort?.abort(),
    install,
    installOnQuit: async () => {
      installOnQuit = true
    }
  })
}
