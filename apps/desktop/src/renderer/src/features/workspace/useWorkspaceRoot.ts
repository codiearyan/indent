import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { FolderMove, FolderMoveProgress } from '@shared/types'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useWorkspace } from '@/stores/workspace'

export interface WorkspaceRoot {
  root: string | null
  moving: boolean
  /** How far the move is, once it has started; `elapsedMs` counts from the first copied byte. */
  progress: (FolderMoveProgress & { elapsedMs: number }) | null
  /** Why the last pick or move failed, shown next to the folder until the next try. */
  error: string | null
  /** A picked folder waiting for the person to confirm. */
  pending: FolderMove | null
  /** Repos picked to move with it; all of them at first. */
  selected: string[]
  setSelected: (labIds: string[]) => void
  change: () => Promise<void>
  /** Switches to the picked folder and moves the selected repos, or none with `move` false. */
  confirm: (move: boolean) => Promise<void>
  cancel: () => void
}

export const repoTitle = (labId: string): string =>
  useCatalog.getState().labs?.find((lab) => lab.id === labId)?.title ?? labId

/** The folder that holds the learner's work, and a way to change it. */
export function useWorkspaceRoot(): WorkspaceRoot {
  const [root, setRoot] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [progress, setProgress] = useState<WorkspaceRoot['progress']>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<FolderMove | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    void api.workspace.getRoot().then(setRoot)
  }, [])

  useEffect(() => {
    if (!moving) return
    let started: number | null = null
    return api.workspace.onMoveProgress((next) => {
      if (started === null && next.totalBytes > 0 && !next.measuring) started = Date.now()
      setProgress({ ...next, elapsedMs: started === null ? 0 : Date.now() - started })
    })
  }, [moving])

  const change = async (): Promise<void> => {
    setError(null)
    try {
      const plan = await api.workspace.pickRoot()
      if (plan && plan.to !== plan.from) {
        setPending(plan)
        setSelected(plan.repos.map((repo) => repo.labId))
      }
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  const confirm = async (move: boolean): Promise<void> => {
    if (!pending) return
    setMoving(true)
    setProgress(null)
    try {
      const workspace = useWorkspace.getState()
      await workspace.flush()
      const result = await api.workspace.moveRoot(move ? selected : [])
      setRoot(result.root)
      const old = pending.from
      setPending(null)
      const chapter = workspace.chapter
      if (chapter) await useWorkspace.getState().open(chapter.labId, chapter.id)
      if (result.failed) {
        toast.error(`${repoTitle(result.failed.labId)} could not move.`, {
          description: `${result.failed.error} It stays in ${old}, with the repos after it, and comes back when you open one of its issues.`
        })
      } else if (result.moved.length < pending.repos.length) {
        toast.success('Your new folder is ready.', {
          description: `Repos you did not move stay in ${old}. Open one of their issues to bring it here.`
        })
      } else {
        toast.success('Your work is in the new folder.')
      }
    } catch (failure) {
      setPending(null)
      setError(errorMessage(failure))
    } finally {
      setMoving(false)
      setProgress(null)
    }
  }

  return {
    root,
    moving,
    progress,
    error,
    pending,
    selected,
    setSelected,
    change,
    confirm,
    cancel: () => setPending(null)
  }
}
