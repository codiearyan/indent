import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { labProgress } from '@/features/catalog/labStatus'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import type { CompletionState } from './CompletionPage'

// Long enough to see the last task turn green before the view changes.
const PAUSE_MS = 1200

/** Whether every task of the repo passes; undefined until the catalog and progress are loaded. */
export function useRepoFinished(labId: string | undefined): boolean | undefined {
  const lab = useCatalog((s) => s.labs?.find((l) => l.id === labId))
  const chapters = useProgress((s) => s.progress?.chapters)
  return lab && chapters ? labProgress(lab, chapters).status === 'completed' : undefined
}

/** Opens the completion view when a check finishes the repo, never when a finished one is opened. */
export function useOpenWhenFinished(labId: string | undefined): void {
  const navigate = useNavigate()
  const finished = useRepoFinished(labId)
  const before = useRef<{ labId: string; finished: boolean } | null>(null)

  useEffect(() => {
    if (!labId || finished === undefined) return
    const was = before.current?.labId === labId ? before.current.finished : undefined
    before.current = { labId, finished }
    if (was !== false || !finished) return
    const state: CompletionState = { celebrate: true }
    const timer = setTimeout(() => navigate(`/labs/${labId}/done`, { state }), PAUSE_MS)
    return () => clearTimeout(timer)
  }, [finished, labId, navigate])
}
