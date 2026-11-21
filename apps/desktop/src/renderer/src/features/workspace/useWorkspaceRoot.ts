import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'

/** The folder that holds the learner's work, and a way to move it. */
export function useWorkspaceRoot(): {
  root: string | null
  moving: boolean
  change: () => Promise<void>
} {
  const [root, setRoot] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    void api.workspace.getRoot().then(setRoot)
  }, [])

  const change = async (): Promise<void> => {
    setMoving(true)
    try {
      const workspace = useWorkspace.getState()
      await workspace.flush()
      const next = await api.workspace.chooseRoot()
      if (!next || next === root) return
      setRoot(next)
      const chapter = workspace.chapter
      if (chapter) await useWorkspace.getState().open(chapter.labId, chapter.id)
      toast.success('Your work is in the new folder.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMoving(false)
    }
  }

  return { root, moving, change }
}
