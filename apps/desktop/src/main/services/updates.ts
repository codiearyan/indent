import { app } from 'electron'
import { autoUpdater, CancellationToken, type UpdateInfo } from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { EVENTS } from '@shared/types'
import { emit, handle } from '../ipc'
import { releaseNoteText, shortNotes } from '../updateRelease'
import { killAll } from './terminal'
import { closeWithoutWaiting } from '../saveBeforeClose'

const OFFLINE = 'Could not reach the update. Check your connection and try again.'

let status: UpdateStatus = { state: 'idle' }
let offered: Extract<UpdateStatus, { state: 'available' }> | null = null
let token: CancellationToken | undefined

function set(next: UpdateStatus): UpdateStatus {
  status = next
  emit(EVENTS.update, next)
  return next
}

function available(info: UpdateInfo): UpdateStatus {
  offered = {
    state: 'available',
    version: info.version,
    notes: shortNotes(releaseNoteText(info.releaseNotes)),
    size: info.files.find((file) => file.size)?.size ?? 0
  }
  return set(offered)
}

/** A failure in words for the person, from the phase it happened in. */
function failed(error: Error): UpdateStatus {
  console.warn('Update failed:', error)
  const text = String(error.message)
  const version = offered?.version
  // A release made before the app updated itself has no update files: nothing to install from here.
  if (/Cannot find latest/.test(text)) return set({ state: 'current', version: app.getVersion() })
  if (/ENOSPC/.test(text)) {
    return set({
      state: 'failed',
      version,
      message: 'There is not enough space on this computer for the update.'
    })
  }
  if (/sha512|checksum/i.test(text)) {
    return set({
      state: 'failed',
      version,
      message: 'The update was damaged on the way. Try again.'
    })
  }
  if (status.state === 'ready' || /code signature|Squirrel/i.test(text)) {
    return set({
      state: 'failed',
      version,
      message: 'Could not install the update here. Download it from the website.'
    })
  }
  if (status.state === 'downloading') return set({ state: 'failed', version, message: OFFLINE })
  return set({
    state: 'failed',
    message: 'Could not check for updates. Check your connection and try again.'
  })
}

/** Looks for a newer release; the updater reads the GitHub release, leaving pre-releases out. */
async function check(): Promise<UpdateStatus> {
  if (status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') {
    return status
  }
  // An unpacked app has nothing to replace, and the updater skips the check.
  if (!app.isPackaged) {
    return set({
      state: 'failed',
      message: 'Updates work in the installed app, not in development.'
    })
  }
  set({ state: 'checking' })
  await autoUpdater.checkForUpdates().catch(() => {})
  return status
}

/** Downloads the release for this computer, only the parts that changed when it can. */
async function download(): Promise<UpdateStatus> {
  if (status.state === 'downloading') return status
  // Nothing offered yet (a failed check, a release missing this computer's file): look again.
  if (!offered) return check()
  token = new CancellationToken()
  set({ state: 'downloading', version: offered.version, done: 0, size: offered.size })
  await autoUpdater.downloadUpdate(token).catch(() => {})
  return status
}

/** Quits and installs: silently on Windows, by swapping the app on macOS and Linux, then reopens. */
async function install(): Promise<UpdateStatus> {
  if (status.state !== 'ready') return status
  // Shells running in the work folder would hold it open while the app is replaced.
  killAll()
  closeWithoutWaiting()
  autoUpdater.quitAndInstall(true, true)
  return status
}

export function register(): void {
  // Nothing downloads unless the person asks. Once they have, the update goes in at "Restart now"
  // or when the app quits; the updater arms that only if this is on when the download finishes.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-available', available)
  autoUpdater.on('update-not-available', () => set({ state: 'current', version: app.getVersion() }))
  autoUpdater.on('download-progress', (progress) => {
    if (status.state !== 'downloading') return
    set({ ...status, done: progress.percent / 100, size: progress.total })
  })
  autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }))
  autoUpdater.on('update-cancelled', () => offered && set(offered))
  autoUpdater.on('error', failed)
  handle('updates', {
    status: async () => status,
    check,
    download,
    cancel: async () => token?.cancel(),
    install
  })
}
