import { create } from 'zustand'
import type { RuntimeStatus } from '@shared/types'
import { api } from '@/lib/api'
import { track } from '@/lib/telemetry'

/** The repo tools (the runtime dependencies in the work folder), as the main process reports them. */
export const useRuntime = create<{ status: RuntimeStatus | null }>()(() => ({ status: null }))

export const retryRuntime = (): void => void api.checks.ensureRuntime()

void api.checks.runtimeStatus().then((status) => useRuntime.setState({ status }))
api.checks.onRuntime((status) => {
  useRuntime.setState({ status })
  // Only the status that ends an install carries `via` or `failure`.
  if (status.via) track('repo_tools_install', { result: 'ready', via: status.via })
  else if (status.failure) track('repo_tools_install', { result: status.failure })
})
