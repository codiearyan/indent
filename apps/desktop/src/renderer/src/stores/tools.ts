import { create } from 'zustand'
import type { LabMeta, ToolStatus } from '@shared/types'
import { api } from '@/lib/api'

/** Node and Git on this computer, read once and again on "Check again" or after a download. */
export const useTools = create<{ tools: ToolStatus[] | null }>()(() => ({ tools: null }))

export async function refreshTools(): Promise<ToolStatus[]> {
  const tools = await api.tools.status()
  useTools.setState({ tools })
  return tools
}

/** The tools a repo needs that are missing; Node alone for a repo that names none. */
export function missingTools(
  lab: Pick<LabMeta, 'tools'>,
  tools: ToolStatus[] | null
): ToolStatus[] {
  if (!tools) return []
  return (lab.tools ?? ['node']).flatMap((id) => tools.filter((tool) => tool.id === id && !tool.ok))
}

void refreshTools().catch(() => {})
