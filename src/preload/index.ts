import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENTS, INVOKE_METHODS, SEND_METHODS } from '@shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (...args: any[]) => unknown

function subscribe(channel: string) {
  return (listener: Fn) => {
    const wrapped = (_event: unknown, ...args: unknown[]): unknown => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
}

const api: Record<string, Record<string, Fn>> = {}
for (const [namespace, methods] of Object.entries(INVOKE_METHODS)) {
  api[namespace] = {}
  for (const method of methods) {
    api[namespace][method] = (...args) => ipcRenderer.invoke(`${namespace}:${method}`, ...args)
  }
}
for (const [namespace, methods] of Object.entries(SEND_METHODS)) {
  for (const method of methods) {
    api[namespace][method] = (...args) => ipcRenderer.send(`${namespace}:${method}`, ...args)
  }
}
api.terminal.onData = subscribe(EVENTS.terminalData)
api.terminal.onExit = subscribe(EVENTS.terminalExit)
api.ai.onChatEvent = subscribe(EVENTS.aiChat)

contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
