import { create } from 'zustand'
import type { UpdateStatus } from '@shared/types'
import { useSettingsDialog } from '@/features/settings/dialogStore'
import { api } from '@/lib/api'
import { useSettings } from './settings'
import { useWorkspace } from './workspace'

const FIRST_CHECK_MS = 5_000
const CHECK_EVERY_MS = 4 * 60 * 60_000

interface UpdatesStore {
  status: UpdateStatus
  /** A version the learner put off with Later; its row stays hidden until the next one. */
  later: string | null
}

export const useUpdates = create<UpdatesStore>()(() => ({ status: { state: 'idle' }, later: null }))

export const checkForUpdates = (): void => void api.updates.check()
export const downloadUpdate = (): void => void api.updates.download()
export const cancelUpdate = (): void => void api.updates.cancel()
export const updateLater = (version: string): void => useUpdates.setState({ later: version })

/** Saves the open files first: the app quits to update. */
export async function installUpdate(): Promise<void> {
  await useWorkspace.getState().flush()
  await api.updates.install()
}

export function installOnQuit(version: string): void {
  void api.updates.installOnQuit()
  updateLater(version)
}

/** For a repo that needs a newer app: shows the update in Settings and looks for it. */
export function getNewVersion(): void {
  useSettingsDialog.getState().show('about')
  checkForUpdates()
}

/** Whether the sidebar should show the update: something to act on that wasn't put off. */
export function useUpdateNeedsAttention(): boolean {
  return useUpdates(({ status, later }) => {
    if (status.state === 'downloading') return true
    if (status.state === 'failed') return !!status.version
    if (status.state === 'available' || status.state === 'ready') return status.version !== later
    return false
  })
}

void api.updates.status().then((status) => useUpdates.setState({ status }))
api.updates.onStatus((status) => useUpdates.setState({ status }))

// Quietly, a few seconds after start and every few hours, and never while a Check runs.
function autoCheck(): void {
  if (!useSettings.getState().autoUpdate || useWorkspace.getState().checking) return
  if (['checking', 'downloading', 'ready'].includes(useUpdates.getState().status.state)) return
  checkForUpdates()
}
setTimeout(autoCheck, FIRST_CHECK_MS)
setInterval(autoCheck, CHECK_EVERY_MS)
