import { BrowserWindow, ipcMain } from 'electron'
import type { Api } from '@shared/types'
import { INVOKE_METHODS, SEND_METHODS } from '@shared/types'

type Namespace = keyof Api
type Handlers<N extends Namespace, M extends string> = Pick<Api[N], Extract<M, keyof Api[N]>>

let ready: Promise<unknown> = Promise.resolve()

/** Requests wait for this first: the content folder may still be filling on a first start. */
export function answerAfter(work: Promise<unknown>): void {
  ready = work.catch(() => {})
}

/** Settles once requests are answered. */
export const whenReady = (): Promise<unknown> => ready

/** Registers a service's request/response methods on `${namespace}:${method}`. */
export function handle<N extends keyof typeof INVOKE_METHODS>(
  namespace: N,
  impl: Handlers<N, (typeof INVOKE_METHODS)[N][number]>
): void {
  for (const [method, fn] of Object.entries(impl)) {
    ipcMain.handle(`${namespace}:${method}`, async (_event, ...args) => {
      await ready
      return (fn as (...a: unknown[]) => unknown)(...args)
    })
  }
}

/** Registers a service's fire-and-forget methods. */
export function listen<N extends keyof typeof SEND_METHODS>(
  namespace: N,
  impl: Handlers<N, (typeof SEND_METHODS)[N][number]>
): void {
  for (const [method, fn] of Object.entries(impl)) {
    ipcMain.on(`${namespace}:${method}`, (_event, ...args) =>
      (fn as (...a: unknown[]) => unknown)(...args)
    )
  }
}

const pageWindows = new WeakSet<BrowserWindow>()

/** A window that shows a learner's page: it has no window.api and is not the app. */
export function markPageWindow(window: BrowserWindow): void {
  pageWindows.add(window)
}

/** The windows that run the app itself, never a page window. */
export function appWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && !pageWindows.has(w))
}

export function emit(channel: string, ...args: unknown[]): void {
  for (const window of appWindows()) window.webContents.send(channel, ...args)
}
