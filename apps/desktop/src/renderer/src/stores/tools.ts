import { create } from 'zustand'
import type { LabMeta, ToolId, ToolStatus } from '@shared/types'
import { api } from '@/lib/api'
import { track } from '@/lib/telemetry'
import { errorMessage } from '@/lib/utils'
import { retryRuntime, useRuntime } from '@/stores/runtime'

/** Where a tool's install is: running (with Node's download share), waiting on a system window, or failed. */
export type ToolInstall =
  | { state: 'running'; done: number | null }
  | { state: 'waiting' }
  | { state: 'failed'; message: string }

interface ToolsStore {
  /** Node and Git on this computer, read once and again on "Check again" or after an install. */
  tools: ToolStatus[] | null
  installs: Partial<Record<ToolId, ToolInstall>>
}

export const useTools = create<ToolsStore>()(() => ({ tools: null, installs: {} }))

const setInstall = (id: ToolId, install?: ToolInstall): void =>
  useTools.setState((s) => {
    const installs = { ...s.installs }
    if (install) installs[id] = install
    else delete installs[id]
    return { installs }
  })

export async function refreshTools(): Promise<ToolStatus[]> {
  const tools = await api.tools.status()
  useTools.setState({ tools })
  // A Node installed outside the app: the repo tools still hold the error from before until asked again.
  const runtime = useRuntime.getState().status
  const nodeOk = tools.some((tool) => tool.id === 'node' && tool.ok)
  if (nodeOk && runtime?.error && !runtime.details) retryRuntime()
  return tools
}

let cancelled = false

/** Installs a tool for the learner, or opens its download page when nothing here can. */
export async function installTool(id: ToolId): Promise<void> {
  cancelled = false
  setInstall(id, { state: 'running', done: id === 'node' ? 0 : null })
  try {
    const result = await api.tools.install(id)
    useTools.setState({ tools: result.tools })
    if (result.url) window.open(result.url, '_blank')
    setInstall(id, result.waiting ? { state: 'waiting' } : undefined)
    track('tool_install', {
      tool: id,
      result: result.url ? 'page' : result.waiting ? 'waiting' : 'done'
    })
  } catch (error) {
    setInstall(id, { state: 'failed', message: errorMessage(error) })
    track('tool_install', { tool: id, result: cancelled ? 'cancelled' : 'failed' })
  }
}

export function cancelInstall(): void {
  cancelled = true
  void api.tools.cancelInstall()
}

/** The tools a repo needs that are missing; Node alone for a repo that names none. */
export function missingTools(
  lab: Pick<LabMeta, 'tools'>,
  tools: ToolStatus[] | null
): ToolStatus[] {
  if (!tools) return []
  return (lab.tools ?? ['node']).flatMap((id) => tools.filter((tool) => tool.id === id && !tool.ok))
}

api.tools.onInstallProgress((id, done) => {
  if (useTools.getState().installs[id]?.state === 'running')
    setInstall(id, { state: 'running', done })
})

void refreshTools().catch(() => {})
