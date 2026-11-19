import { BrowserWindow, ipcMain } from 'electron'
import type { Api } from '@shared/types'
import { INVOKE_METHODS, SEND_METHODS } from '@shared/types'

type Namespace = keyof Api
type Handlers<N extends Namespace, M extends string> = Pick<Api[N], Extract<M, keyof Api[N]>>

/** Registers a service's request/response methods on `${namespace}:${method}`. */
export function handle<N extends keyof typeof INVOKE_METHODS>(
  namespace: N,
  impl: Handlers<N, (typeof INVOKE_METHODS)[N][number]>
): void {
  for (const [method, fn] of Object.entries(impl)) {
    ipcMain.handle(`${namespace}:${method}`, (_event, ...args) =>
      (fn as (...a: unknown[]) => unknown)(...args)
    )
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

export function emit(channel: string, ...args: unknown[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, ...args)
  }
}
