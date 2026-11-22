import { contextBridge, ipcRenderer } from 'electron'
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
  api[namespace] ??= {}
  for (const method of methods) {
    api[namespace][method] = (...args) => ipcRenderer.send(`${namespace}:${method}`, ...args)
  }
}
api.terminal.onData = subscribe(EVENTS.terminalData)
api.terminal.onExit = subscribe(EVENTS.terminalExit)
api.ai.onChatEvent = subscribe(EVENTS.aiChat)
api.ai.onInstallProgress = subscribe(EVENTS.aiInstall)
api.content.onInstallProgress = subscribe(EVENTS.contentInstall)
api.content.onChanged = subscribe(EVENTS.contentChanged)
api.checks.onRuntime = subscribe(EVENTS.runtime)
api.workspace.onMoveProgress = subscribe(EVENTS.folderMove)
api.tools.onInstallProgress = subscribe(EVENTS.toolInstall)
api.updates.onStatus = subscribe(EVENTS.update)
api.preview.onWindow = subscribe(EVENTS.previewWindow)

contextBridge.exposeInMainWorld('platform', process.platform)
contextBridge.exposeInMainWorld('api', api)
