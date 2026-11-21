import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { FolderMove } from '@shared/types'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'

export interface WorkspaceRoot {
  root: string | null
  moving: boolean
  /** Why the last pick or move failed, shown next to the folder until the next try. */
  error: string | null
  /** A picked folder waiting for the person to confirm the move. */
  pending: FolderMove | null
  change: () => Promise<void>
  confirm: () => Promise<void>
  cancel: () => void
}

/** The folder that holds the learner's work, and a way to move it. */
export function useWorkspaceRoot(): WorkspaceRoot {
  const [root, setRoot] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<FolderMove | null>(null)

  useEffect(() => {
    void api.workspace.getRoot().then(setRoot)
  }, [])

  const change = async (): Promise<void> => {
    setError(null)
    try {
      const plan = await api.workspace.pickRoot()
      if (plan && plan.to !== plan.from) setPending(plan)
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  const confirm = async (): Promise<void> => {
    if (!pending) return
    setMoving(true)
    try {
      const workspace = useWorkspace.getState()
      await workspace.flush()
      setRoot(await api.workspace.moveRoot(pending.to))
      setPending(null)
      const chapter = workspace.chapter
      if (chapter) await useWorkspace.getState().open(chapter.labId, chapter.id)
      toast.success('Your work is in the new folder.')
    } catch (failure) {
      setPending(null)
      setError(errorMessage(failure))
    } finally {
      setMoving(false)
    }
  }

  return { root, moving, error, pending, change, confirm, cancel: () => setPending(null) }
}
