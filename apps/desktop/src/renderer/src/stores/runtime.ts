import { create } from 'zustand'
import type { RuntimeStatus } from '@shared/types'
import { api } from '@/lib/api'

/** The repo tools (the runtime dependencies in the work folder), as the main process reports them. */
export const useRuntime = create<{ status: RuntimeStatus | null }>()(() => ({ status: null }))

export const retryRuntime = (): void => void api.checks.ensureRuntime()

void api.checks.runtimeStatus().then((status) => useRuntime.setState({ status }))
api.checks.onRuntime((status) => useRuntime.setState({ status }))
