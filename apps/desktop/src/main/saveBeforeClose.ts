import { app, ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { EVENTS } from '@shared/types'

/** A page that does not answer must never keep the app from closing. */
const WAIT_MS = 2000

let quitting = false
/** The updater closes the windows itself, after the page saved; holding them would stop it. */
let updating = false
app.on('before-quit', () => {
  quitting = true
})

/** Asks the page to write what is not saved yet and settles on its answer, or after WAIT_MS. */
function askToSave(window: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer)
      ipcMain.removeListener('workspace:flushed', answered)
      resolve()
    }
    const answered = (event: IpcMainEvent): void => {
      if (event.sender === window.webContents) finish()
    }
    const timer = setTimeout(finish, WAIT_MS)
    ipcMain.on('workspace:flushed', answered)
    window.webContents.send(EVENTS.flush)
  })
}

/** For the updater: the page already saved, so the windows close at once. */
export function closeWithoutWaiting(): void {
  updating = true
}

/**
 * Edits are saved a moment after the last keystroke, and the page goes away with the window. So
 * the window waits for the page to write them before it closes, and a quit that closed it goes on.
 */
export function saveBeforeClose(window: BrowserWindow): void {
  let saved = false
  window.on('close', (event) => {
    if (saved || updating || window.webContents.isCrashed()) return
    event.preventDefault()
    void askToSave(window).then(() => {
      saved = true
      if (quitting) app.quit()
      else if (!window.isDestroyed()) window.close()
    })
  })
}
